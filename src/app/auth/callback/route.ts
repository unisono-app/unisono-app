import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeLineCode, getLineProfile } from "@/lib/auth/line";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // LINE からのエラー
  if (errorParam) {
    console.error(
      "Auth callback: LINE error",
      errorParam,
      searchParams.get("error_description")
    );
    return NextResponse.redirect(`${origin}/login`);
  }

  // code パラメータなし
  if (!code) {
    console.error("Auth callback: code parameter missing");
    return NextResponse.redirect(`${origin}/login`);
  }

  // state 検証（CSRF 保護）
  const cookieStore = await cookies();
  const savedState = cookieStore.get("line_oauth_state")?.value;
  if (!state || state !== savedState) {
    console.error("Auth callback: state mismatch");
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${origin}/auth/callback`;

    // LINE の auth code をアクセストークンに交換
    const tokens = await exchangeLineCode(code, redirectUri);

    // LINE プロフィール取得
    const profile = await getLineProfile(tokens.access_token);
    const lineUid = profile.userId;
    const displayName = profile.displayName;
    const avatarUrl = profile.pictureUrl ?? null;

    const email = `line_${lineUid}@unisono.local`.toLowerCase();
    const adminClient = createAdminClient();

    // まず public.users から line_uid で既存ユーザーを検索（最も信頼性が高い）
    const { data: appUser } = await adminClient
      .from("users")
      .select("id, approval_status")
      .eq("line_uid", lineUid)
      .maybeSingle();

    let authUserId: string;

    if (appUser) {
      // 既存アプリユーザー → auth.users.id はそのまま使える
      authUserId = appUser.id;

      // 認証側のメタデータと public.users 両方を最新の LINE 情報で同期
      await adminClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          line_uid: lineUid,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      });
      await adminClient
        .from("users")
        .update({
          display_name: displayName,
          ...(avatarUrl !== null && { avatar_url: avatarUrl }),
        })
        .eq("id", authUserId);
    } else {
      // 未登録 → 新しい auth ユーザーを作成
      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            line_uid: lineUid,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
        });

      if (createData?.user) {
        authUserId = createData.user.id;
      } else if (createError) {
        // 孤立した auth ユーザー（過去に作成されたが public.users 未作成）
        // フォールバック: listUsers で email 検索
        const {
          data: { users },
        } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existing = users.find((u) => u.email?.toLowerCase() === email);
        if (!existing) {
          console.error(
            "listUsers returned emails:",
            users.map((u) => u.email)
          );
          console.error("searching for:", email);
          throw new Error("Failed to find existing auth user");
        }
        authUserId = existing.id;

        await adminClient.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            line_uid: lineUid,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
        });
      } else {
        throw new Error("Unexpected state: no user and no error");
      }
    }

    // Magic Link でセッション作成
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkError || !linkData) {
      throw new Error(`Failed to generate link: ${linkError?.message}`);
    }

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });
    if (verifyError) {
      throw new Error(`Failed to verify OTP: ${verifyError.message}`);
    }

    // リダイレクト先を判定
    const redirectPath = !appUser
      ? "/register"
      : appUser.approval_status === "approved"
        ? "/practices"
        : "/approval-pending";

    const response = NextResponse.redirect(`${origin}${redirectPath}`);
    response.cookies.delete("line_oauth_state");
    return response;
  } catch (err) {
    console.error("Auth callback: unexpected error", err);
    return NextResponse.redirect(`${origin}/login`);
  }
}
