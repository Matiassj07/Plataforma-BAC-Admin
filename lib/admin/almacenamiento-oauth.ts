export type OAuthProvider = "onedrive" | "sharepoint";

export interface OAuthTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
}

export interface DriveItem {
  id: string;
  name: string;
  eTag: string;
  lastModifiedDateTime: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  "@microsoft.graph.downloadUrl"?: string;
}

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

const CALLBACK_PATH = "/api/auth/callback/microsoft";

function microsoftConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID ?? "";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? "";
  const redirectUri = `${baseUrl()}${CALLBACK_PATH}`;
  return { clientId, clientSecret, redirectUri, configured: !!(clientId && clientSecret) };
}

export function proveedorConfigurado(_proveedor: OAuthProvider): boolean {
  return microsoftConfig().configured;
}

export function buildAuthUrl(_proveedor: OAuthProvider, state: string): string {
  const { clientId, redirectUri } = microsoftConfig();
  const scopes = "offline_access Files.ReadWrite.All User.Read";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCode(_proveedor: OAuthProvider, code: string): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri } = microsoftConfig();
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "Microsoft token exchange failed");
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? null,
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
  };
}

export async function refreshAccessToken(_proveedor: OAuthProvider, refreshToken: string): Promise<OAuthTokens> {
  const { clientId, clientSecret } = microsoftConfig();
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? "Microsoft refresh failed");
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
  };
}

export async function uploadFile(
  _proveedor: OAuthProvider,
  accessToken: string,
  carpetaDestino: string,
  fileName: string,
  fileContent: Uint8Array,
): Promise<{ id: string; url: string; eTag: string }> {
  let folderPath = carpetaDestino;
  try {
    const parsed = new URL(folderPath);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const docIdx = segments.findIndex((s) => s.toLowerCase() === "documents");
    folderPath = docIdx >= 0 ? segments.slice(docIdx).join("/") : segments.slice(-1).join("/") || "BAC";
  } catch {
    // Not a URL — use as-is
  }
  folderPath = folderPath.replace(/^\/+|\/+$/g, "");
  const endpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}/${fileName}:/content`;
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: fileContent as unknown as BodyInit,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "OneDrive upload failed");
  return { id: json.id as string, url: (json.webUrl ?? "") as string, eTag: (json.eTag ?? "") as string };
}

export async function listFolderChildren(
  accessToken: string,
  folderPath: string,
): Promise<DriveItem[]> {
  const cleanPath = folderPath.replace(/^\/+|\/+$/g, "");
  const endpoint = cleanPath
    ? `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(cleanPath)}:/children?$top=200`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children?$top=200`;

  const items: DriveItem[] = [];
  let url: string | null = endpoint;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message ?? `Graph list failed (${res.status})`);
    }
    const json = await res.json() as { value?: DriveItem[]; "@odata.nextLink"?: string };
    items.push(...(json.value ?? []));
    url = json["@odata.nextLink"] ?? null;
  }

  return items;
}

export async function downloadDriveItem(
  accessToken: string,
  itemId: string,
): Promise<{ data: Uint8Array; name: string; mimeType: string }> {
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) throw new Error("No se pudo obtener metadata del archivo");
  const meta: DriveItem = await metaRes.json();

  const downloadUrl = meta["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) throw new Error("No se encontró URL de descarga");

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) throw new Error("Error al descargar archivo desde OneDrive");
  const buffer = new Uint8Array(await fileRes.arrayBuffer());

  return {
    data: buffer,
    name: meta.name,
    mimeType: meta.file?.mimeType ?? "application/octet-stream",
  };
}
