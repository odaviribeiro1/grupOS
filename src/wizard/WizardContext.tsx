import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

const LS_PREFIX = "grupos:wizard:";
function lsKey(userId: string | undefined, suffix: string) {
  return `${LS_PREFIX}${userId ?? "anon"}:${suffix}`;
}
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignora */
  }
}

export type UazapiConfigRow = {
  id: string;
  user_id: string;
  api_url: string | null;
  api_token: string | null;
  instance_id: string | null;
  instance_connected: boolean;
  openai_api_key: string | null;
  onboarding_completed: boolean;
};

export type WizardState = {
  step: number; // 1..6
  loading: boolean;
  error: string | null;
  config: UazapiConfigRow | null;
  selectedGroupIds: string[]; // whatsapp_group_id[] (seleção temporária até concluir)
};

type Ctx = WizardState & {
  goTo: (step: number) => void;
  next: () => void;
  back: () => void;
  refresh: () => Promise<void>;
  patchConfig: (patch: Partial<UazapiConfigRow>) => Promise<UazapiConfigRow>;
  setSelectedGroupIds: (ids: string[]) => void;
  // canEnter(step): só permite entrar em step N se steps 1..N-1 tiverem dados válidos
  canEnter: (step: number) => boolean;
  highestCompletedStep: () => number;
};

const WizardCtx = React.createContext<Ctx | undefined>(undefined);

function highestCompleted(
  config: UazapiConfigRow | null,
  selectedIds: string[]
): number {
  if (!config) return 0;
  const s1 =
    !!(config.api_url && config.api_url.length > 0 && config.api_token);
  const s2 = s1 && !!config.instance_id;
  const s3 = s2 && !!config.instance_connected;
  const s4 = s3 && !!config.openai_api_key;
  const s5 = s4 && selectedIds.length > 0;
  const s6 = s5 && config.onboarding_completed;
  return [s1, s2, s3, s4, s5, s6].filter(Boolean).length;
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [state, setState] = React.useState<WizardState>(() => ({
    step: readLS<number>(lsKey(uid, "step"), 1),
    loading: true,
    error: null,
    config: null,
    selectedGroupIds: readLS<string[]>(lsKey(uid, "selectedGroupIds"), []),
  }));

  // Sincroniza step + seleção para localStorage (scoped por usuário).
  React.useEffect(() => {
    writeLS(lsKey(uid, "step"), state.step);
  }, [uid, state.step]);
  React.useEffect(() => {
    writeLS(lsKey(uid, "selectedGroupIds"), state.selectedGroupIds);
  }, [uid, state.selectedGroupIds]);

  const refresh = React.useCallback(async () => {
    if (!user) return;
    // Só mostramos "loading" no primeiro fetch; nos seguintes, atualizamos em
    // background pra não desmontar os steps (e perder drafts dos inputs).
    setState((s) => ({
      ...s,
      loading: s.config ? s.loading : true,
      error: null,
    }));
    const { data, error } = await supabase
      .from("uazapi_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }
    const config = (data as UazapiConfigRow | null) ?? null;
    setState((s) => {
      const done = highestCompleted(config, s.selectedGroupIds);
      const nextStep = Math.min(6, Math.max(s.step, done + 1));
      return { ...s, loading: false, config, step: nextStep };
    });
  }, [user]);

  React.useEffect(() => {
    void refresh();
    // Depender só do id evita re-execução quando o Supabase renova o token
    // e muda a referência do objeto `user`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const patchConfig = React.useCallback(
    async (patch: Partial<UazapiConfigRow>): Promise<UazapiConfigRow> => {
      if (!user) throw new Error("Sem sessão");
      const existing = state.config;
      if (existing) {
        const { data, error } = await supabase
          .from("uazapi_config")
          .update(patch)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        setState((s) => ({ ...s, config: data as UazapiConfigRow }));
        return data as UazapiConfigRow;
      } else {
        const { data, error } = await supabase
          .from("uazapi_config")
          .insert({ user_id: user.id, ...patch })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        setState((s) => ({ ...s, config: data as UazapiConfigRow }));
        return data as UazapiConfigRow;
      }
    },
    [user, state.config]
  );

  const value: Ctx = {
    ...state,
    goTo: (step) =>
      setState((s) => {
        const maxAllowed = highestCompleted(s.config, s.selectedGroupIds) + 1;
        return { ...s, step: Math.min(Math.max(1, step), maxAllowed) };
      }),
    next: () => setState((s) => ({ ...s, step: Math.min(6, s.step + 1) })),
    back: () => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) })),
    refresh,
    patchConfig,
    setSelectedGroupIds: (ids) =>
      setState((s) => ({ ...s, selectedGroupIds: ids })),
    canEnter: (step) =>
      step <= highestCompleted(state.config, state.selectedGroupIds) + 1,
    highestCompletedStep: () =>
      highestCompleted(state.config, state.selectedGroupIds),
  };

  return <WizardCtx.Provider value={value}>{children}</WizardCtx.Provider>;
}

export function useWizard() {
  const ctx = React.useContext(WizardCtx);
  if (!ctx)
    throw new Error("useWizard deve ser usado dentro de <WizardProvider>");
  return ctx;
}
