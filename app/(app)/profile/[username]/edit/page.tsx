import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile || profile.id !== user.id) {
    notFound();
  }

  return <ProfileForm profile={profile} />;
}
