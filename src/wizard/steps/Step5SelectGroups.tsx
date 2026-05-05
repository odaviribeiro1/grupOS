import { useEffect, useMemo, useState } from "react";
import { Search, Users2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { uazapi, type UazapiGroup } from "@/lib/uazapi";

export function Step5SelectGroups() {
  const { config, selectedGroupIds, setSelectedGroupIds, next } = useWizard();
  const [groups, setGroups] = useState<UazapiGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true") {
      setGroups([
        { id: "dev-group-1@g.us", name: "Grupo Dev 1", participantsCount: 12 },
        { id: "dev-group-2@g.us", name: "Grupo Dev 2", participantsCount: 8 },
        { id: "dev-group-3@g.us", name: "Grupo Dev 3", participantsCount: 25 },
      ]);
      return;
    }
    if (!config?.api_url || !config.api_token || !config.instance_id) return;
    setLoading(true);
    uazapi
      .listGroups(config.api_url, config.api_token, config.instance_id)
      .then((gs) => {
        setGroups(gs);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Falha ao listar grupos")
      )
      .finally(() => setLoading(false));
  }, [config?.api_url, config?.api_token, config?.instance_id]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, filter]);

  function toggle(id: string) {
    setSelectedGroupIds(
      selectedGroupIds.includes(id)
        ? selectedGroupIds.filter((x) => x !== id)
        : [...selectedGroupIds, id]
    );
  }

  async function reload() {
    if (!config?.api_url || !config.api_token || !config.instance_id) return;
    setLoading(true);
    try {
      const gs = await uazapi.listGroups(
        config.api_url,
        config.api_token,
        config.instance_id
      );
      setGroups(gs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar grupos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Step 5 · Selecionar grupos</CardTitle>
        <CardDescription>
          Escolha ao menos um grupo para monitorar. Você pode adicionar outros
          depois.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Buscar grupo por nome…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
              aria-label="Buscar grupo"
            />
          </div>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            {loading ? "Carregando…" : "Recarregar"}
          </Button>
        </div>

        <Label>Grupos disponíveis ({filtered.length})</Label>
        <div className="max-h-80 overflow-y-auto rounded-xl border border-brand-500/15 bg-black/30">
          {loading && (
            <p className="p-4 text-xs text-ink-400">Buscando grupos…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-xs text-ink-400">
              Nenhum grupo encontrado.
            </p>
          )}
          <ul className="divide-y divide-brand-500/10">
            {filtered.map((g) => {
              const selected = selectedGroupIds.includes(g.id);
              return (
                <li key={g.id || g.name}>
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-all",
                      selected
                        ? "bg-brand-500/10"
                        : "hover:bg-brand-500/5"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-brand-400 bg-brand-500/30"
                          : "border-brand-500/30"
                      )}
                      aria-hidden
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-sm bg-brand-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-50">{g.name}</p>
                      <p className="text-[11px] text-ink-400">
                        {g.participantsCount ?? "?"} participantes
                      </p>
                    </div>
                    <Users2 className="h-4 w-4 text-ink-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-[11px] text-ink-400">
          {selectedGroupIds.length} selecionado(s).
        </p>
      </div>

      <StepFooter
        onNext={() => next()}
        nextDisabled={selectedGroupIds.length === 0}
        busy={loading}
        error={error}
      />
    </>
  );
}
