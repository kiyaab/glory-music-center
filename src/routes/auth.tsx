import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Music2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Sign In | Glory Music Center" },
      { name: "description", content: "Admin sign in for Glory Music Center registration dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

import { ADMIN_CREDENTIALS, getClientAdminSession, setClientAdminSession } from "@/lib/auth-admin";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getClientAdminSession()) {
      navigate({ to: "/admin" });
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check Master Administrator credentials
      if (normalizedEmail === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        setClientAdminSession();
        toast.success("Welcome back, Administrator!");
        navigate({ to: "/admin" });
        return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { full_name: fullName.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now sign in.");
      }
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="glass-panel gold-ring w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl leading-none">Glory Music Center</p>
              <p className="text-xs text-muted-foreground mt-0.5">Admin & Portal Access</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
            <Link to="/">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Home
            </Link>
          </Button>
        </div>

        <h1 className="mt-8 font-display text-2xl">{mode === "signin" ? "Sign In" : "Create Account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {mode === "signin"
            ? "Sign in with your email and password to access the admin portal."
            : "Register your account, then access the portal or receive role elevation."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="e.g. Daniel Korsa"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="min-h-11 rounded-2xl bg-card"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="admin@glorymusic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-2xl bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-2xl bg-card"
            />
          </div>

          {mode === "signin" && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Admin Credentials:</p>
                <p className="text-muted-foreground font-mono text-[11px] mt-0.5">admin@glory.com · admin1234</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => {
                  setEmail("admin@glory.com");
                  setPassword("admin1234");
                }}
              >
                Auto-fill
              </Button>
            </div>
          )}

          <Button type="submit" disabled={loading} className="min-h-12 w-full rounded-full shadow-lg font-medium">
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
