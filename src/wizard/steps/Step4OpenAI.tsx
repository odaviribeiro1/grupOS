import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { uazapi } from "@/lib/uazapi";
import { useAuth } from "@/auth/AuthContext";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

function mask(key: string) {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 5)}••••${key.slice(-4)}`;
}

export function Step4OpenAI() {
  const { user } = useAuth();
  const { config, patchConfig, next } = useWizard();
  const alreadySaved = !!config?.openai_api_key;
  const [value, setValue, clearValue] = useLocalStorageState<string>(
    `grupos:wizard:${user?.id ?? "anon"}:step4:openaiKey`,
    ""
  );
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^sk-/i.test(value.trim());

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      if (import.meta.env.VITE_DEV_MODE !== "true") {
        await uazapi.validateOpenAIKey(value);
      }
      await patchConfig({ openai_api_key: value.trim() });
      clearValue();
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao validar chave");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Step 4 · Chave OpenAI</CardTitle>
        <CardDescription>
          Usaremos a OpenAI GPT-4.1 Mini para gerar resumos e Whisper para
          transcrever áudios. A chave fica restrita ao seu usuário (RLS).
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {alreadySaved && !value && (
          <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs text-ink-200">
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-success" />
              Chave salva: <code>{mask(config!.openai_api_key!)}</code>
            </span>
            <button
              className="text-ink-400 underline hover:text-ink-50"
              onClick={() => setValue("")}
            >
              Substituir
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="openaiKey">
            {alreadySaved ? "Substituir chave" : "OpenAI API key"}
          </Label>
          <div className="relative">
            <Input
              id="openaiKey"
              type={show ? "text" : "password"}
              placeholder="sk-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-50"
              aria-label={show ? "Ocultar" : "Mostrar"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <StepFooter
        onNext={alreadySaved && !value ? () => next() : onSave}
        nextLabel={alreadySaved && !value ? "Continuar" : "Salvar e continuar"}
        nextDisabled={!alreadySaved && !valid}
        busy={busy}
        error={error}
      />
    </>
  );
}
