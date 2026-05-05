import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "grupos" },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Evolution API v2 participant format:
// { "id": "5511999@s.whatsapp.net", "admin": "superadmin" | "admin" | null }
type EvolutionParticipant = {
  id: string;
  admin?: string | null;
};

function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

async function fetchParticipants(
  apiUrl: string,
  token: string,
  instanceId: string,
  groupChatId: string
): Promise<EvolutionParticipant[]> {
  const url = `${normalizeUrl(apiUrl)}/group/participants/${encodeURIComponent(instanceId)}?groupJid=${encodeURIComponent(groupChatId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", apikey: token },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution participants error ${res.status}: ${text}`);
  }

  const body = await res.json();
  return (Array.isArray(body) ? body : body.participants || []) as EvolutionParticipant[];
}

function extractPhone(jid: string): string {
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { group_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.group_id) {
    return json({ error: "group_id is required" }, 400);
  }

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id, whatsapp_group_id, uazapi_config_id")
    .eq("id", body.group_id)
    .single();

  if (groupErr || !group) {
    return json({ error: "Group not found" }, 404);
  }

  if (!group.uazapi_config_id) {
    return json({ error: "Group has no config" }, 400);
  }

  const { data: config, error: configErr } = await supabase
    .from("uazapi_config")
    .select("api_url, api_token, instance_id")
    .eq("id", group.uazapi_config_id)
    .single();

  if (configErr || !config) {
    return json({ error: "Config not found" }, 404);
  }

  if (!config.api_url || !config.api_token || !config.instance_id) {
    return json({ error: "Config incomplete" }, 400);
  }

  let participants: EvolutionParticipant[];
  try {
    participants = await fetchParticipants(
      config.api_url,
      config.api_token,
      config.instance_id,
      group.whatsapp_group_id
    );
  } catch (err) {
    console.error("Failed to fetch participants:", err);
    return json({ error: `Evolution API error: ${(err as Error).message}` }, 502);
  }

  let upserted = 0;
  const errors: string[] = [];

  for (const p of participants) {
    if (!p.id) continue;

    const record = {
      group_id: group.id,
      jid: p.id,
      lid: null,
      phone_number: extractPhone(p.id),
      display_name: "",
      is_admin: p.admin === "admin" || p.admin === "superadmin",
      is_super_admin: p.admin === "superadmin",
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("group_participants")
      .upsert(record, { onConflict: "group_id,jid" });

    if (upsertErr) {
      errors.push(`${p.id}: ${upsertErr.message}`);
    } else {
      upserted++;
    }
  }

  const { error: updateErr } = await supabase
    .from("groups")
    .update({ participant_count: participants.length, updated_at: new Date().toISOString() })
    .eq("id", group.id);

  if (updateErr) {
    console.error("Failed to update group participant_count:", updateErr);
  }

  return json({
    status: "ok",
    total_from_api: participants.length,
    upserted,
    errors: errors.length > 0 ? errors : undefined,
  });
});
