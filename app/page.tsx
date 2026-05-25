"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/loading-state";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("setup_complete")
        .eq("id", data.user.id)
        .single();
      router.replace(profile?.setup_complete ? "/dashboard" : "/setup");
    });
  }, [router]);

  return <LoadingState label="Opening Property Scout..." />;
}
