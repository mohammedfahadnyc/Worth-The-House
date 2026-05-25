"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Chrome, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactSignature } from "@/components/contact-signature";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEmail, validateEmail } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    if (!password) return setError("Password is required.");
    if (!isSupabaseConfigured()) {
      return setError(
        "Supabase is not configured yet. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart npm run dev.",
      );
    }

    setLoading(true);
    const cleanEmail = normalizeEmail(email);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/setup`,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Could not create account.");

        if (data.session) {
          await ensureProfile(supabase, data.user);
          router.replace("/setup");
        } else {
          setMessage("Check your email to confirm your account, then log in.");
        }
      } else {
        const { data: loginData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;
        if (!loginData.user) throw new Error("Could not sign in.");

        const profile = await ensureProfile(supabase, loginData.user);
        router.replace(profile?.setup_complete ? "/dashboard" : "/setup");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setMessage("");
    if (!isSupabaseConfigured()) {
      return setError(
        "Supabase is not configured yet. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart npm run dev.",
      );
    }

    setOauthLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/setup`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">Property Scout</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Track properties. Run the numbers. Remember every detail.
            </p>
          </div>
          <Card className="p-6">
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={signInWithGoogle}
                disabled={oauthLoading}
                className="w-full"
              >
                <Chrome className="h-4 w-4" />
                {oauthLoading ? "Opening Google..." : "Continue with Google"}
              </Button>
            </div>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
              {error ? <p className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
              <Button className="w-full" disabled={loading}>
                {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            {message ? <p className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p> : null}
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <Link className="font-medium text-emerald-200 hover:text-emerald-100" href={mode === "signup" ? "/login" : "/signup"}>
                {mode === "signup" ? "Log in" : "Sign up"}
              </Link>
            </p>
          </Card>
        </div>
      </div>
      <ContactSignature />
    </div>
  );
}
