import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "@/types/database";

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  if (!supabase) {
    return {
      configured: false,
      user: null,
      profile: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  return {
    configured: true,
    user,
    profile: profile as UserProfile | null,
  };
}

export async function requireRole(role: UserRole) {
  const session = await getCurrentUserProfile();

  if (!session.configured || !session.user) {
    redirect("/");
  }

  if (session.profile?.role !== role) {
    redirect("/access-denied");
  }

  return session as typeof session & {
    configured: true;
    user: NonNullable<typeof session.user>;
    profile: UserProfile;
  };
}
