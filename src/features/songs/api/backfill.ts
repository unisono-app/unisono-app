import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROFILE_TO_SONG_PART } from "../constants";

/**
 * 指定ユーザーを、プロフィール所属パートに対応する編成パートで既存の全楽曲に登録する。
 * 編成にそのパートが含まれる曲のみ登録し（例: 編成に Prim が無い曲は Prim ユーザーを登録しない）、
 * 既存の登録は上書きしない（ignoreDuplicates）。
 *
 * 【暫定対応】ユーザー受け入れ期間中に、承認時へ既存楽曲の担当パートを一括登録するために使う。
 * 恒久仕様（新規楽曲追加時のみ自動登録）は createSong 側にあり、本処理は環境変数
 * BACKFILL_ON_APPROVE=true のときのみ approveUser から呼ばれる。期間終了時はフラグを外す。
 *
 * 他ユーザー分の song_user_parts を書くため service_role（admin クライアント）を使う。
 * 呼び出し元 approveUser 側で承認権限をチェック済み。
 */
export async function registerUserToExistingSongs(userId: string) {
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("part")
    .eq("id", userId)
    .single();

  const songPart = user?.part ? PROFILE_TO_SONG_PART[user.part] : undefined;
  if (!songPart) return; // パート未設定 or 対応なし → 登録対象なし

  const { data: songs } = await admin.from("songs").select("id, arrangements");

  const rows = (songs ?? [])
    .filter(
      (s) => Array.isArray(s.arrangements) && s.arrangements.includes(songPart)
    )
    .map((s) => ({ song_id: s.id, user_id: userId, part: songPart }));

  if (rows.length === 0) return;

  const { error } = await admin
    .from("song_user_parts")
    .upsert(rows, { onConflict: "song_id,user_id", ignoreDuplicates: true });

  if (error) {
    console.error("registerUserToExistingSongs failed:", error.message);
    // 承認自体は成功させるため、ここでは throw しない
  }
}
