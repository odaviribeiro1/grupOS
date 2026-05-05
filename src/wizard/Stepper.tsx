import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWizard } from "@/wizard/WizardContext";

const STEP_LABELS = [
  "Credenciais",
  "Instância",
  "QR Code",
  "OpenAI",
  "Grupos",
  "Revisão",
];

export function Stepper() {
  const { step, goTo, canEnter, highestCompletedStep } = useWizard();
  const done = highestCompletedStep();

  return (
    <ol className="flex w-full items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n <= done;
        const clickable = canEnter(n);
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && goTo(n)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-all",
                !clickable && "cursor-not-allowed opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                  isDone &&
                    "border-success/60 bg-success/15 text-success shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                  !isDone && isActive &&
                    "border-brand-400/70 bg-brand-500/15 text-ink-50 shadow-glow-sm",
                  !isDone && !isActive && "border-brand-500/20 text-ink-400"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : n}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  isActive ? "text-ink-50" : "text-ink-400"
                )}
              >
                {label}
              </span>
            </button>
            {n < STEP_LABELS.length && (
              <div
                className={cn(
                  "mx-1 hidden h-px flex-1 sm:block",
                  isDone ? "bg-success/40" : "bg-brand-500/15"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
