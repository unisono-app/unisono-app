import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションのリフレッシュ
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  // `/` → `/practices` へリダイレクト
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/practices";
    return NextResponse.redirect(url);
  }

  // 未認証ユーザーを `/login` へリダイレクト（公開ページは除外）
  const publicPaths = ["/login", "/auth"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーが `/login` にアクセスした場合 → `/practices` へ
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/practices";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
