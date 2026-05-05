import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { uazapi } from "@/lib/uazapi";

const POLL_INTERVAL_MS = 4000;

function QrImage({ data }: { data: string }) {
  const src = data.startsWith("data:") ? data : `data:image/png;base64,${data}`;
  return (
    <img
      src={src}
      alt="QR Code para conectar WhatsApp"
      className="h-60 w-60 rounded-xl border border-brand-500/30 bg-white p-2"
    />
  );
}

export function Step3QRCode() {
  const { config, patchConfig, next } = useWizard();
  const isDevMode = import.meta.env.VITE_DEV_MODE === "true";
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(
    !!config?.instance_connected || isDevMode
  );
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDevMode && !config?.instance_connected) {
      void patchConfig({ instance_connected: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevMode]);

  async function fetchQr() {
    if (isDevMode) return;
    if (!config?.api_url || !config.api_token || !config.instance_id) return;
    try {
      const res = await uazapi.getQrCode(
        config.api_url,
        config.api_token,
        config.instance_id
      );
      if (res.qr) setQr(res.qr);
      if (res.connected && !connected) {
        setConnected(true);
        await patchConfig({ instance_connected: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao buscar QR");
    }
  }

  async function pollStatus() {
    if (isDevMode) return;
    if (!config?.api_url || !config.api_token || !config.instance_id) return;
    try {
      const res = await uazapi.getInstanceStatus(
        config.api_url,
        config.api_token,
        config.instance_id
      );
      if (res.connected && !connected) {
        setConnected(true);
        await patchConfig({ instance_connected: true });
      }
    } catch {
      /* ignora erros transientes de polling */
    }
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    await fetchQr();
    setBusy(false);
  }

  useEffect(() => {
    if (connected) return;
    void fetchQr();
    timerRef.current = window.setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (
    <>
      <CardHeader>
        <CardTitle>Step 3 · Conectar WhatsApp</CardTitle>
        <CardDescription>
          Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho e
          escaneie o QR abaixo.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col items-center gap-4 py-4">
        {connected ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-ink-200">WhatsApp conectado</p>
          </div>
        ) : qr ? (
          <>
            <QrImage data={qr} />
            <Button variant="outline" onClick={regenerate} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              {busy ? "Atualizando…" : "Gerar novo QR"}
            </Button>
            <p className="text-xs text-ink-400">
              Aguardando scan… verificamos a conexão automaticamente.
            </p>
          </>
        ) : (
          <div className="flex h-60 w-60 items-center justify-center rounded-xl border border-brand-500/20 bg-black/30 text-xs text-ink-400">
            Carregando QR…
          </div>
        )}
      </div>

      <StepFooter
        onNext={() => next()}
        nextDisabled={!connected}
        busy={busy}
        error={error}
      />
    </>
  );
}
