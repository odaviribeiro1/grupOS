import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizard } from "@/wizard/WizardContext";

export function StepFooter({
  onNext,
  nextLabel = "Continuar",
  nextDisabled = false,
  busy = false,
  hideBack = false,
  hideNext = false,
  error = null,
}: {
  onNext?: () => void | Promise<void>;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
  error?: string | null;
}) {
  const { back, step } = useWizard();
  return (
    <div className="mt-6 flex flex-col gap-3">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        {!hideBack && step > 1 ? (
          <Button variant="ghost" onClick={back} disabled={busy}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        ) : (
          <span />
        )}
        {!hideNext && (
          <Button
            onClick={() => void onNext?.()}
            disabled={nextDisabled || busy}
          >
            {busy ? "Aguarde…" : nextLabel}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
