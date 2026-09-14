export type ChatLinkType = "web" | "custom-protocol" | "fluent";

export type ChatPreset = {
  id: string;
  name: string;
  url: string;
  type: ChatLinkType;
};

function linkType(url: string): ChatLinkType {
  if (/^https?:\/\//i.test(url)) return "web";
  if (url.toLowerCase().startsWith("fluent")) return "fluent";
  return "custom-protocol";
}

export function parseChatConfig(raw: unknown): ChatPreset[] {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const entries = Object.entries(entry);
    if (entries.length !== 1) return [];
    const [name, value] = entries[0];
    if (typeof value !== "string" || !value.trim()) return [];
    const url = value.trim();
    return [{ id: String(index), name, url, type: linkType(url) }];
  });
}

function encodeConfig(value: object) {
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(value)))));
}

export function resolveChatUrl({
  template,
  apiKey,
  serverAddress,
}: {
  template: string;
  apiKey: string;
  serverAddress: string;
}) {
  const key = apiKey.trim().startsWith("sk-") ? apiKey.trim() : `sk-${apiKey.trim()}`;
  const replace = (token: string, value: string) => template.split(token).join(value);
  if (template.includes("{cherryConfig}")) {
    return replace("{cherryConfig}", encodeConfig({ id: "new-api", baseUrl: serverAddress, apiKey: key }));
  }
  if (template.includes("{aionuiConfig}")) {
    return replace("{aionuiConfig}", encodeConfig({ platform: "new-api", baseUrl: serverAddress, apiKey: key }));
  }
  if (template.includes("{lobeConfig}")) {
    return replace(
      "{lobeConfig}",
      encodeURIComponent(JSON.stringify({
        keyVaults: {
          openai: {
            apiKey: key,
            baseURL: `${serverAddress.replace(/\/$/, "")}/v1`,
          },
        },
      })),
    );
  }
  return replace("{address}", encodeURIComponent(serverAddress)).split("{key}").join(key);
}
