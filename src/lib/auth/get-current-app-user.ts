import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

type AppUser = {
  id: string;
  line_uid: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string;
  role: string;
  approval_status: string;
};

type AppUserResult =
  | { status: "unauthenticated" }
  | { status: "unregistered"; user: User }
  | { status: "pending"; user: User; appUser: AppUser }
  | { status: "approved"; user: User; appUser: AppUser };

export function getLineUid(user: User): string | null {
  return user.user_metadata?.line_uid ?? null;
}

export const getAppUser = cache(async (): Promise<AppUserResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const lineUid = getLineUid(user);
  if (!lineUid) {
    return { status: "unauthenticated" };
  }

  const admin = createAdminClient();
  const { data: appUser, error } = await admin
    .from("users")
    .select(
      "id, line_uid, display_name, avatar_url, nickname, role, approval_status"
    )
    .eq("line_uid", lineUid)
    .single();

  if (error || !appUser) {
    return { status: "unregistered", user };
  }

  if (appUser.approval_status === "pending") {
    return { status: "pending", user, appUser };
  }

  return { status: "approved", user, appUser };
});
