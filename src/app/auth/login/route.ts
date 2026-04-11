import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getLineAuthUrl } from "@/lib/auth/line";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/auth/callback`;

  // CSRF 保護用の state を生成・Cookie に保存
  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const authUrl = getLineAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
