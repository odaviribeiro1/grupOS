import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { supabase } from "@/lib/supabase";
import { uazapi } from "@/lib/uazapi";
import { useAuth } from "@/auth/AuthContext";

type CheckItem = { label: string; ok: boolean };

export function Step6Review() {
  const { user } = useAuth();
  const { config, selectedGroupIds, patchConfig } = useWizard();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks: CheckItem[] = [
    { label: "URL + token UAZAPI", ok: !!(config?.api_url && config?.api_token) },
    { label: "Instância criada", ok: !!config?.instance_id },
    { label: "WhatsApp conectado", ok: !!config?.instance_connected },
    { label: "Chave OpenAI", ok: !!config?.openai_api_key },
    { label: "Ao menos 1 grupo selecionado", ok: selectedGroupIds.length > 0 },
  ];
  const allOk = checks.every((c) => c.ok);

  async function onFinish() {
    if (!user || !config) return;
    setBusy(true);
    setError(null);
    try {
      // Busca metadata dos grupos selecionados para persistir nome/participantes.
      let groupsMeta: Record<string, { name: string; participants?: number }> = {};
      try {
        const list = await uazapi.listGroups(
          config.api_url!,
          config.api_token!,
          config.instance_id!
        );
        groupsMeta = Object.fromEntries(
          list.map((g) => [
            g.id,
            { name: g.name, participants: g.participantsCount },
          ])
        );
      } catch {
        /* segue com o que tiver — ainda inserimos com nome placeholder */
      }

      // Filtra grupos já cadastrados para evitar duplicatas.
      const { data: existing } = await supabase
        .from("groups")
        .select("whatsapp_group_id")
        .eq("user_id", user.id)
        .in("whatsapp_group_id", selectedGroupIds);
      const alreadyIn = new Set(
        (existing ?? []).map(
          (r) => (r as { whatsapp_group_id: string }).whatsapp_group_id
        )
      );
      const toInsert = selectedGroupIds
        .filter((id) => !alreadyIn.has(id))
        .map((id) => ({
          user_id: user.id,
          uazapi_config_id: config.id,
          whatsapp_group_id: id,
          name: groupsMeta[id]?.name ?? id,
          participant_count: groupsMeta[id]?.participants ?? 0,
          is_active: true,
        }));
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("groups")
          .insert(toInsert);
        if (insertError) throw new Error(insertError.message);
      }

      await patchConfig({ onboarding_completed: true });
      navigate("/grupos", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao concluir onboarding"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Step 6 · Revisão</CardTitle>
        <CardDescription>
          Confira o status de cada etapa. Quando tudo estiver verde, clique em
          Concluir.
        </CardDescription>
      </CardHeader>

      <ul className="flex flex-col gap-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
              c.ok
                ? "border-success/30 bg-success/5 text-ink-50"
                : "border-danger/30 bg-danger/5 text-ink-50"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                c.ok ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
              )}
            >
              {c.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            {c.label}
          </li>
        ))}
      </ul>

      <StepFooter
        onNext={onFinish}
        nextLabel="Concluir"
        nextDisabled={!allOk}
        busy={busy}
        error={error}
      />
    </>
  );
}
