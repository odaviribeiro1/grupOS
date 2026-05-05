// Cliente para UAZAPI v2 (WhatsApp).
// Convenções:
// - Header `token` para operações de instância; `admintoken` para operações de admin.
//   Enviamos ambos com o mesmo valor — UAZAPI aceita o que for aplicável ao endpoint.
// - O `instanceId` armazenado em uazapi_config corresponde ao identificador retornado
//   por /instance/init. Endpoints de instância são autenticados pelo token, não pela URL.

export type UazapiGroup = {
  id: string;
  name: string;
  participantsCount?: number;
  imgUrl?: string | null;
};

export type InstanceStatus = {
  connected: boolean;
  status?: string;
  raw?: unknown;
};

function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function baseHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    token,
    admintoken: token,
  };
}

async function http<T>(
  url: string,
  init: RequestInit,
  label: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error(
      `[UAZAPI ${label}] Falha de rede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* texto puro */
  }
  if (!res.ok) {
    throw new Error(
      `[UAZAPI ${label}] HTTP ${res.status}: ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }
  return body as T;
}

export const uazapi = {
  async validateCredentials(rawUrl: string, token: string): Promise<boolean> {
    if (!/^https?:\/\//i.test(rawUrl.trim())) {
      throw new Error("URL deve começar com http:// ou https://");
    }
    if (!token.trim()) throw new Error("Token é obrigatório");
    const url = `${normalizeUrl(rawUrl)}/instance/all`;
    await http<unknown>(
      url,
      { method: "GET", headers: baseHeaders(token) },
      "validate"
    );
    return true;
  },

  async createInstance(
    rawUrl: string,
    token: string,
    name: string
  ): Promise<{ instanceId: string; raw: unknown }> {
    const url = `${normalizeUrl(rawUrl)}/instance/init`;
    const body = await http<Record<string, unknown>>(
      url,
      {
        method: "POST",
        headers: baseHeaders(token),
        body: JSON.stringify({ name }),
      },
      "createInstance"
    );
    const instance =
      (body.instance as Record<string, unknown> | undefined) ?? body;
    const id =
      (instance?.id as string) ||
      (instance?.name as string) ||
      (instance?.token as string);
    if (!id) {
      throw new Error("Resposta da UAZAPI sem id/nome de instância reconhecível");
    }
    return { instanceId: id, raw: body };
  },

  async getQrCode(
    rawUrl: string,
    token: string,
    _instanceId: string
  ): Promise<{ qr: string | null; connected: boolean }> {
    const url = `${normalizeUrl(rawUrl)}/instance/connect`;
    const body = await http<Record<string, unknown>>(
      url,
      {
        method: "POST",
        headers: baseHeaders(token),
        body: JSON.stringify({}),
      },
      "connect"
    );
    const instance = body.instance as Record<string, unknown> | undefined;
    const status =
      (instance?.status as string) || (body.status as string) || undefined;
    if (status === "connected" || status === "open") {
      return { qr: null, connected: true };
    }
    const qr =
      (body.qrcode as string) ||
      (body.qrCode as string) ||
      (body.base64 as string) ||
      null;
    return { qr, connected: false };
  },

  async getInstanceStatus(
    rawUrl: string,
    token: string,
    _instanceId: string
  ): Promise<InstanceStatus> {
    const url = `${normalizeUrl(rawUrl)}/instance/status`;
    const body = await http<Record<string, unknown>>(
      url,
      { method: "GET", headers: baseHeaders(token) },
      "status"
    );
    const instance =
      (body.instance as Record<string, unknown> | undefined) ?? body;
    const status = instance?.status as string | undefined;
    return {
      connected: status === "connected" || status === "open",
      status,
      raw: body,
    };
  },

  async listGroups(
    rawUrl: string,
    token: string,
    _instanceId: string
  ): Promise<UazapiGroup[]> {
    const url = `${normalizeUrl(rawUrl)}/group/list`;
    const body = await http<unknown>(
      url,
      { method: "GET", headers: baseHeaders(token) },
      "listGroups"
    );
    const arr = Array.isArray(body)
      ? body
      : Array.isArray((body as Record<string, unknown>)?.groups)
      ? ((body as Record<string, unknown>).groups as unknown[])
      : [];
    return (arr as Record<string, unknown>[]).map((g) => ({
      id:
        (g.id as string) ||
        (g.JID as string) ||
        (g.wa_chatid as string) ||
        (g.chatid as string) ||
        "",
      name:
        (g.name as string) ||
        (g.subject as string) ||
        (g.wa_name as string) ||
        "(sem nome)",
      participantsCount:
        (g.participantsCount as number) ??
        (g.size as number) ??
        (g.wa_count as number) ??
        undefined,
      imgUrl:
        (g.imageUrl as string) ||
        (g.image as string) ||
        (g.pictureUrl as string) ||
        null,
    }));
  },

  async validateOpenAIKey(key: string): Promise<boolean> {
    if (!/^sk-/i.test(key.trim()))
      throw new Error("Chave OpenAI deve começar com 'sk-'");
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key.trim()}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI rejeitou a chave (HTTP ${res.status}): ${text}`);
    }
    return true;
  },
};
