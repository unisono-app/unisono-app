import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// 常にリクエスト時に実行し、DB へ到達させる（キャッシュさせない）。
// Next.js 16 では Route Handler は既定で非キャッシュだが、明示しておく。
export const dynamic = "force-dynamic";

// 稼働監視 + Supabase 無料枠の7日休止防止用エンドポイント。
// DB へ軽量クエリ(ping)を投げ、成功なら 200 / 失敗なら 503 を返す。
export async function GET(request: NextRequest) {
  // 任意のトークンガード（HEALTH_CHECK_TOKEN が設定されているときのみ有効）
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (expected) {
    const token = request.nextUrl.searchParams.get("token");
    if (token !== expected) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { error } = await supabase.rpc("ping");

  if (error) {
    console.error("health check failed:", error.message);
    return NextResponse.json({ status: "error", db: false }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", db: true });
}
