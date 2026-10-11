import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, GraduationCap, Music2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_CREDENTIALS, getClientAdminSession, setClientAdminSession } from "@/lib/auth-admin";
import { isCurrentUserAdmin } from "@/lib/admin.functions";

export type AuthSearch = {
  portal?: "student" | "admin";
  redirect?: string;
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    portal: (search.portal as "student" | "admin") || undefined,
    redirect: (search.redirect as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Student & Admin Login | Glory Music Center" },
      { name: "description", content: "Sign in to the Glory Music Center Student Portal or Administrator Dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });

  const [portalType, setPortalType] = useState<"student" | "admin">(
    search.portal === "admin" ? "admin" : "student",
  );
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If master admin session is active
    if (getClientAdminSession()) {
      navigate({ to: "/admin" });
      return;
    }

    // Check existing auth state
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        try {
          const { isAdmin } = await isCurrentUserAdmin({});
          if (isAdmin) {
            navigate({ to: "/admin" });
          } else {
            navigate({ to: "/student" });
          }
        } catch {
          navigate({ to: portalType === "admin" ? "/admin" : "/student" });
        }
      }
    });
  }, [navigate, portalType]);

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
        const { error, data: authData } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;

        toast.success("Welcome back to Glory Music Center!");

        // Route intelligently based on role
        if (portalType === "admin") {
          navigate({ to: "/admin" });
        } else {
          // If student portal, navigate to /student
          navigate({ to: search.redirect || "/student" });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/student`,
            data: {
              full_name: fullName.trim() || undefined,
              role: portalType === "admin" ? "admin" : "user",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully! You can now access your portal.");
        navigate({ to: portalType === "admin" ? "/admin" : "/student" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 sm:py-16">
      <div className="glass-panel gold-ring w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary font-display font-bold text-lg shadow-sm border border-primary/30">
              G
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight">Glory Music Center</p>
              <p className="text-xs text-muted-foreground">Academy Portal Access</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
            <Link to="/">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Website
            </Link>
          </Button>
        </div>

        {/* Portal Switcher Tabs: Student Portal vs Admin Portal */}
        <div className="mt-6">
          <Tabs
            value={portalType}
            onValueChange={(val) => {
              setPortalType(val as "student" | "admin");
              if (val === "admin") {
                setEmail("admin@glory.com");
                setPassword("admin1234");
              } else {
                setEmail("");
                setPassword("");
              }
            }}
          >
            <TabsList className="grid grid-cols-2 h-11 w-full rounded-full p-1 bg-muted/60">
              <TabsTrigger value="student" className="rounded-full text-xs font-semibold">
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Student Portal
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-full text-xs font-semibold">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Admin Staff
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Portal Specific Title and Description */}
        <div className="mt-5">
          {portalType === "student" ? (
            <div>
              <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-primary text-[11px] px-2.5 py-0.5">
                <Sparkles className="mr-1 h-3 w-3" /> Student Access
              </Badge>
              <h1 className="mt-2 font-display text-2xl font-bold">
                {mode === "signin" ? "Student Portal Sign In" : "Register Student Account"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                View your digital student ID card, weekly class schedule, attendance records, and instrument practice materials.
              </p>
            </div>
          ) : (
            <div>
              <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] px-2.5 py-0.5">
                <ShieldCheck className="mr-1 h-3 w-3" /> Management
              </Badge>
              <h1 className="mt-2 font-display text-2xl font-bold">
                Administrator Portal
              </h1>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Authorized staff sign-in for taking attendance, managing student registrations, and platform control.
              </p>
            </div>
          )}
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Student Full Name</Label>
              <Input
                id="full-name"
                placeholder="e.g. Yohannes Tesfaye"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="min-h-11 rounded-2xl bg-card text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">
              {portalType === "student" ? "Student Email Address" : "Admin Email Address"}
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder={portalType === "student" ? "student@example.com" : "admin@glory.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-2xl bg-card text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-2xl bg-card text-sm"
            />
          </div>

          {/* Admin Credentials Helper Callout */}
          {portalType === "admin" && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Master Admin Credentials:</p>
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

          {/* Student Helper Callout */}
          {portalType === "student" && mode === "signin" && (
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Registered at the Academy?</p>
                <p className="text-muted-foreground text-[11px]">
                  Use the email address you or your parent provided during course registration.
                </p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="min-h-12 w-full rounded-full shadow-lg font-medium text-sm">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : mode === "signin" ? (
              portalType === "student" ? "Sign In to Student Portal" : "Sign In to Admin Dashboard"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 space-y-2 text-center text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="hover:text-primary transition-colors cursor-pointer block w-full"
          >
            {mode === "signin"
              ? "New student? Create your account here"
              : "Already have an account? Sign in"}
          </button>

          <p className="pt-2 border-t border-border/40">
            Need to register for new courses?{" "}
            <Link to="/" className="text-primary font-semibold hover:underline">
              Enroll on website
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
