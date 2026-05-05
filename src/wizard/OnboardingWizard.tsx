import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useWizard, WizardProvider } from "@/wizard/WizardContext";
import { Stepper } from "@/wizard/Stepper";
import { Step1Credentials } from "@/wizard/steps/Step1Credentials";
import { Step2CreateInstance } from "@/wizard/steps/Step2CreateInstance";
import { Step3QRCode } from "@/wizard/steps/Step3QRCode";
import { Step4OpenAI } from "@/wizard/steps/Step4OpenAI";
import { Step5SelectGroups } from "@/wizard/steps/Step5SelectGroups";
import { Step6Review } from "@/wizard/steps/Step6Review";

function WizardShell() {
  const { step, loading } = useWizard();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        Carregando onboarding…
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink-50">
              Configuração inicial — GrupOS
            </h1>
            <p className="text-xs text-ink-400">
              Conecte sua UAZAPI, OpenAI e escolha os grupos monitorados.
            </p>
          </div>
        </header>

        <Card>
          <Stepper />
        </Card>

        <Card>
          {step === 1 && <Step1Credentials />}
          {step === 2 && <Step2CreateInstance />}
          {step === 3 && <Step3QRCode />}
          {step === 4 && <Step4OpenAI />}
          {step === 5 && <Step5SelectGroups />}
          {step === 6 && <Step6Review />}
        </Card>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
