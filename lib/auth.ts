import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLES_STAFF, type Profile, type RolEnum } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.rol !== "admin") {
    redirect("/login");
  }
  return profile;
}

export async function requireStaff(...roles: RolEnum[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const allowed = roles.length > 0 ? roles : ROLES_STAFF;
  if (!allowed.includes(profile.rol)) {
    redirect("/login");
  }
  return profile;
}
