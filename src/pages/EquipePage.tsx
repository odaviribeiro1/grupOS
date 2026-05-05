import { useEffect, useState } from "react";
import {
  Shield,
  UserPlus,
  Trash2,
  Crown,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/pages/placeholder";

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "editor";
  created_at: string;
};

function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .order("created_at");
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return { members, loading, reload: load };
}

export function EquipePage() {
  const { user } = useAuth();
  const { members, loading, reload } = useMembers();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
            inviter_id: user?.id,
            origin: window.location.origin,
          }),
        }
      );

      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
      if (!res.ok) throw new Error((data.error as string) || `HTTP ${res.status}`);

      setSuccess(`Convite enviado para ${inviteEmail.trim()} como ${inviteRole}.`);
      setInviteEmail("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao convidar");
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "editor") {
    const { error: updateErr } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    await reload();
  }

  async function handleDelete(memberId: string) {
    if (memberId === user?.id) {
      setError("Você não pode remover a si mesmo.");
      return;
    }
    setDeletingId(memberId);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            member_id: memberId,
            requester_id: user?.id,
          }),
        }
      );

      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
      if (!res.ok) throw new Error((data.error as string) || `HTTP ${res.status}`);

      if (data.status === "partial") {
        setError(
          "Membro removido da equipe, mas a sessão de auth não pôde ser revogada. O acesso pode persistir — contate o suporte."
        );
      } else if (data.status === "banned") {
        setSuccess("Membro removido e acesso revogado via banimento.");
      } else {
        setSuccess("Membro removido e sessão revogada.");
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Equipe"
        subtitle="Gerenciar membros e permissões."
      />

      {/* Invite form */}
      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-ink-50">
          Convidar membro
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleInvite();
              }}
            />
          </div>
          <div className="w-36">
            <Label htmlFor="invite-role">Papel</Label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "editor")}
              className="input-base h-10 w-full rounded-xl px-3 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Convidar
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        {success && (
          <p className="mt-2 text-xs text-success">{success}</p>
        )}
      </Card>

      {/* Members list */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-ink-400">Carregando membros...</p>
        </div>
      )}

      {!loading && members.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Shield className="h-10 w-10 text-ink-400" />
          <p className="text-sm text-ink-300">Nenhum membro encontrado.</p>
        </Card>
      )}

      {!loading && members.length > 0 && (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card
              key={m.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                  {(m.name || m.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink-100">
                      {m.name || m.email.split("@")[0]}
                    </p>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        m.role === "admin"
                          ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                          : "bg-brand-500/15 text-brand-400 border border-brand-500/30"
                      )}
                    >
                      {m.role === "admin" ? (
                        <Crown className="h-2.5 w-2.5" />
                      ) : (
                        <Pencil className="h-2.5 w-2.5" />
                      )}
                      {m.role}
                    </span>
                    {m.id === user?.id && (
                      <span className="text-[9px] text-ink-400">(você)</span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-ink-400">
                    {m.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {m.id !== user?.id && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) =>
                        handleChangeRole(
                          m.id,
                          e.target.value as "admin" | "editor"
                        )
                      }
                      className="input-base h-8 rounded-lg px-2 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                    >
                      {deletingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-ink-400 hover:text-danger" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
