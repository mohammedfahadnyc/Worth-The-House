"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSignature } from "@/components/contact-signature";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              <Home className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">WorthTheHouse</span>
              <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link href="/properties/new">
                <Plus className="h-4 w-4" />
                Add House
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Log out" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <ContactSignature />
    </div>
  );
}
