"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FollowButtonProps {
  profileId: string;
  isFollowing: boolean;
}

export function FollowButton({ profileId, isFollowing }: FollowButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [following, setFollowing] = useState(isFollowing);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setSubmitting(false);
      return;
    }

    if (following) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_id", profileId);
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase
        .from("followers")
        .insert({ follower_id: user.id, followee_id: profileId });
      if (!error) setFollowing(true);
    }

    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className={following ? "btn-secondary" : "btn-primary"}
    >
      {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
