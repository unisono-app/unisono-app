import "server-only";

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID!;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export function getLineAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINE_CHANNEL_ID,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

export async function exchangeLineCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string }> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE token exchange failed: ${body}`);
  }

  return res.json();
}

export async function getLineProfile(
  accessToken: string
): Promise<LineProfile> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE profile fetch failed: ${body}`);
  }

  return res.json();
}
