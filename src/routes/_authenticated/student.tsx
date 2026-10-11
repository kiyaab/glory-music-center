import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Music,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Sparkles,
  Timer,
  User,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { clearClientAdminSession } from "@/lib/auth-admin";
import {
  getStudentPortalData,
  linkStudentAccount,
  logStudentPractice,
  type StudentProfile,
} from "@/lib/student.functions";
import { formatScheduleLabel } from "@/lib/registration.functions";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({
    meta: [
      { title: "Student Portal | Glory Music Center" },
      { name: "description", content: "Glory Music Center student dashboard, digital ID card, attendance tracking, and practice resources." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const portalDataFn = useServerFn(getStudentPortalData);
  const logPracticeFn = useServerFn(logStudentPractice);
  const linkAccountFn = useServerFn(linkStudentAccount);

  const [activeTab, setActiveTab] = useState("overview");
  const [openIdCardDialog, setOpenIdCardDialog] = useState(false);
  const [openPracticeDialog, setOpenPracticeDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);

  // Practice logger inputs
  const [practiceDuration, setPracticeDuration] = useState<number>(30);
  const [practiceNotes, setPracticeNotes] = useState("");

  // Link account input
  const [studentIdInput, setStudentIdInput] = useState("");

  const portalQuery = useQuery({
    queryKey: ["student-portal-data"],
    queryFn: () => portalDataFn({}),
  });

  const practiceMutation = useMutation({
    mutationFn: (data: { registrationId: string; durationMinutes: number; notes: string }) =>
      logPracticeFn({ data }),
    onSuccess: () => {
      toast.success("Practice session logged! Keep up the great work!");
      setOpenPracticeDialog(false);
      setPracticeNotes("");
      queryClient.invalidateQueries({ queryKey: ["student-portal-data"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const linkMutation = useMutation({
    mutationFn: (data: { studentIdOrPhone: string }) => linkAccountFn({ data }),
    onSuccess: (res) => {
      toast.success(`Successfully linked ${res.studentName}'s record!`);
      setOpenLinkDialog(false);
      setStudentIdInput("");
      queryClient.invalidateQueries({ queryKey: ["student-portal-data"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearClientAdminSession();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (portalQuery.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-16">
        <div className="glass-panel text-center max-w-sm rounded-[2rem] p-8 border border-border/60">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <h2 className="font-display text-xl font-semibold">Loading Student Portal</h2>
          <p className="mt-2 text-xs text-muted-foreground">Fetching your class schedule, attendance records, and student ID…</p>
        </div>
      </main>
    );
  }

  const data = portalQuery.data;
  const profile = data?.profile;
  const attendance = data?.attendance;
  const curriculum = data?.curriculum;
  const practiceLogs = data?.practiceLogs ?? [];

  if (!profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-16 text-center">
        <div className="glass-panel max-w-md rounded-[2rem] p-8 border border-border/60">
          <h1 className="font-display text-2xl font-bold">Portal Session Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">Unable to load student record. Please sign in again.</p>
          <Button onClick={handleSignOut} className="mt-6 rounded-full">
            Sign In
          </Button>
        </div>
      </main>
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalPracticeMinutes = practiceLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary font-display font-bold text-xl border border-primary/30 shadow-md">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold">
                <GraduationCap className="mr-1 h-3.5 w-3.5" /> Student Portal
              </Badge>
              <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Enrolled
              </Badge>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Glory Music Center
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="min-h-10 rounded-full text-xs">
            <Link to="/">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Website
            </Link>
          </Button>
          <Button
            variant="outline"
            className="min-h-10 rounded-full text-xs text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>

      {/* Hero Card / Student Identity Banner */}
      <div className="glass-panel gold-ring rounded-[2.5rem] p-6 sm:p-8 bg-gradient-to-br from-card via-card to-primary/5 border border-primary/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/30 to-amber-400/20 border-2 border-primary/40 font-display text-2xl font-bold text-primary shadow-inner">
              {initials}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold shadow">
                ✓
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Music Academy Student
              </p>
              <h2 className="mt-0.5 font-display text-2xl sm:text-3xl font-bold text-foreground">
                {profile.fullName}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Official Student ID badge with copy action */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.studentId);
                    toast.success(`Copied Student ID ${profile.studentId}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all cursor-pointer group shadow-sm"
                  title="Click to copy your official Student ID"
                >
                  <span>Student ID: {profile.studentId}</span>
                  <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
                <Badge variant="outline" className="rounded-full text-xs capitalize font-medium px-3 py-1">
                  Major: {profile.course}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setOpenIdCardDialog(true)}
              className="rounded-full min-h-11 px-5 shadow-lg font-medium text-xs sm:text-sm"
            >
              <CreditCard className="mr-2 h-4 w-4" /> Official Student ID Card
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenPracticeDialog(true)}
              className="rounded-full min-h-11 px-4 text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/10"
            >
              <Flame className="mr-2 h-4 w-4 text-amber-500" /> Log Practice
            </Button>
          </div>
        </div>

        {/* Link Account Notice if not matched */}
        {!data?.hasMatchedRegistration && (
          <div className="mt-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Link Your Existing Student Registration
              </span>
              <p className="text-muted-foreground">
                Have an official Student ID (e.g. GMC-2026-0001) or phone number registered with the office? Link it to synchronize your full records.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs shrink-0"
              onClick={() => setOpenLinkDialog(true)}
            >
              Link Registration
            </Button>
          </div>
        )}
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Attendance Rate */}
        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance Rate
            </span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p
            className={`mt-2 font-display text-3xl font-bold ${
              (attendance?.attendanceRate ?? 100) >= 80
                ? "text-emerald-500"
                : (attendance?.attendanceRate ?? 100) >= 60
                ? "text-amber-500"
                : "text-rose-500"
            }`}
          >
            {attendance?.attendanceRate ?? 100}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {attendance?.presentCount ?? 0} present · {attendance?.lateCount ?? 0} late · {attendance?.absentCount ?? 0} absent
          </p>
        </div>

        {/* Schedule */}
        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Class Shift
            </span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-foreground leading-tight truncate">
            {profile.scheduleLabel}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Weekly Academy Sessions</p>
        </div>

        {/* Total Sessions */}
        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Sessions
            </span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">
            {attendance?.totalSessions ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Logged by Academy Instructors</p>
        </div>

        {/* Practice Logged */}
        <div className="glass-panel rounded-3xl p-5 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Practice Time
            </span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-500">
            {Math.round(totalPracticeMinutes / 60)}h {totalPracticeMinutes % 60}m
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Personal instrument practice</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="h-auto sm:h-12 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 rounded-2xl sm:rounded-full p-1.5 bg-muted/60 gap-1 sm:gap-0">
          <TabsTrigger value="overview" className="rounded-full font-medium text-xs sm:text-sm">
            <Music className="mr-1.5 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-full font-medium text-xs sm:text-sm">
            <CalendarCheck className="mr-1.5 h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-full font-medium text-xs sm:text-sm">
            <BookOpen className="mr-1.5 h-4 w-4" /> Lessons Guide
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-full font-medium text-xs sm:text-sm">
            <CreditCard className="mr-1.5 h-4 w-4" /> ID Card & Info
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Schedule & Announcements */}
            <div className="lg:col-span-2 space-y-6">
              {/* Class Schedule Card */}
              <div className="glass-panel rounded-[2rem] p-6 border border-border/60 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="font-display text-lg font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Active Class Schedule
                  </h3>
                  <Badge className="bg-primary/10 text-primary border-primary/30 capitalize text-xs">
                    {profile.course} Department
                  </Badge>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-muted-foreground">Assigned Shift</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Regular Group/Lab</span>
                  </div>
                  <p className="font-display text-xl font-bold text-foreground">
                    {profile.scheduleLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Classes run at Glory Music Center training facility in Bale Robe Square. Please arrive 10 minutes prior to session start.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-muted/20 p-3.5 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Center Location</span>
                    <span className="font-semibold text-foreground mt-0.5 block">Bale Robe Square, Oromia</span>
                  </div>
                  <div className="rounded-2xl bg-muted/20 p-3.5 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Direct Instructor Phone</span>
                    <a href="tel:+251910287951" className="font-mono text-primary font-semibold hover:underline mt-0.5 block">
                      +251 91 028 7951
                    </a>
                  </div>
                </div>
              </div>

              {/* Academy Announcements Card */}
              <div className="glass-panel rounded-[2rem] p-6 border border-border/60 space-y-4">
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" /> Academy Notices & Events
                </h3>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-primary uppercase tracking-wide">Upcoming Event</span>
                      <span className="text-[11px] text-muted-foreground">2026 Season</span>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">Sunday Live Worship Performance Practicum</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All enrolled students in piano, keyboard, guitar, and saxophone will participate in the guided ensemble workshop.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-muted/20 border border-border/40 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-muted-foreground uppercase tracking-wide">Practice Labs</span>
                      <span className="text-[11px] text-muted-foreground">Open Daily</span>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">Open Instrument Studio Practice Hours</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Need extra instrument time? The training center acoustic room is open for registered students between 8:00 AM and 6:00 PM.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right col: Practice Log & Streak */}
            <div className="space-y-6">
              <div className="glass-panel rounded-[2rem] p-6 border border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold flex items-center gap-2">
                    <Flame className="h-5 w-5 text-amber-500" /> Daily Practice Log
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setOpenPracticeDialog(true)}
                    className="rounded-full text-xs font-semibold"
                  >
                    + Log Time
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Consistent practice builds muscle memory and ear training faster than sporadic long sessions.
                </p>

                <div className="rounded-2xl bg-muted/30 p-4 border border-border/40 text-center">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Logged Practice Total
                  </span>
                  <p className="mt-1 font-display text-3xl font-bold text-amber-500">
                    {Math.round(totalPracticeMinutes / 60)}h {totalPracticeMinutes % 60}m
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {practiceLogs.length} total recorded practice sessions
                  </p>
                </div>

                <div className="space-y-2 mt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Recent Practice Logs
                  </span>
                  {practiceLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 rounded-xl bg-muted/20">
                      No practice logged yet. Click "+ Log Time" to record your daily drills!
                    </p>
                  ) : (
                    practiceLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-xl bg-card border border-border/50 p-3 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold block truncate">{log.notes || "Instrument practice"}</span>
                          <span className="text-[11px] text-muted-foreground">{log.date}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs font-semibold text-amber-500 border-amber-500/30">
                          {log.durationMinutes} min
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ATTENDANCE HISTORY */}
        <TabsContent value="attendance" className="mt-6 space-y-6">
          <div className="glass-panel overflow-hidden rounded-[2rem] border border-border/60">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" /> Session Attendance History
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete official attendance log recorded by Glory Music Center staff.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                  {attendance?.presentCount ?? 0} Present
                </Badge>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                  {attendance?.lateCount ?? 0} Late
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {attendance?.absentCount ?? 0} Absent
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Session Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Recorded</TableHead>
                    <TableHead>Instructor Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance?.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        No attendance records recorded yet. Your teacher will record attendance during your scheduled sessions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance?.history.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-xs whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {item.status === "present" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                              🟢 Present
                            </Badge>
                          )}
                          {item.status === "late" && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
                              🟡 Late
                            </Badge>
                          )}
                          {item.status === "absent" && (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              🔴 Absent
                            </Badge>
                          )}
                          {item.status === "excused" && (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px]">
                              🔵 Excused
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.timeIn || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.remarks || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: CURRICULUM & LESSONS GUIDE */}
        <TabsContent value="curriculum" className="mt-6 space-y-6">
          <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8 border border-border/60 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/30 uppercase text-xs">
                  Curriculum Module
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">Instrument: {profile.course}</span>
              </div>
              <h3 className="font-display text-2xl font-bold mt-1 text-foreground">
                {curriculum?.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {curriculum?.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {curriculum?.topics.map((topic, idx) => (
                <div
                  key={topic.title}
                  className="rounded-2xl bg-card border border-border/60 p-5 space-y-3 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-display text-base font-bold text-foreground leading-snug">
                        {topic.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {topic.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Recommended Practice Drills:
                    </span>
                    {topic.exercises.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: OFFICIAL ID CARD & PROFILE */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student ID Card Visual */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border-2 border-primary/40 bg-gradient-to-b from-card via-card/95 to-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-400 via-primary to-amber-500" />
                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display font-bold text-xl shadow-md">
                    G
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold tracking-tight text-foreground leading-tight">
                      GLORY MUSIC CENTER
                    </h3>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                      Academy of Music & Worship
                    </p>
                    <p className="text-[10px] text-muted-foreground">Bale Robe, Oromia, Ethiopia</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/30 to-amber-400/20 border-2 border-primary/40 font-display text-2xl font-bold text-primary shadow-inner">
                    {initials}
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold shadow">
                      ✓
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Student Name
                    </p>
                    <h4 className="font-display text-lg font-bold text-foreground truncate">
                      {profile.fullName}
                    </h4>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/30">
                        {profile.studentId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-muted/40 p-3.5 text-xs border border-border/40">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Course</span>
                    <span className="font-semibold capitalize text-foreground">{profile.course}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Status</span>
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase px-2 py-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {profile.status}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Class Schedule</span>
                    <span className="font-medium text-foreground">{profile.scheduleLabel}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Phone</span>
                    <span className="font-mono text-foreground">{profile.phoneNumber}</span>
                  </div>
                </div>

                <div className="mt-5 border-t border-border/60 pt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-0.5 h-6">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3].map((w, idx) => (
                        <div key={idx} className="bg-foreground/70 h-full" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <p className="font-mono text-[9px] tracking-widest text-muted-foreground mt-0.5">{profile.studentId}</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      <QrCode className="h-3 w-3" /> VERIFIED
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Academic Year 2026</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={() => window.print()} className="rounded-full">
                  <Printer className="mr-2 h-4 w-4" /> Print ID Card
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.studentId);
                    toast.success(`Copied Student ID ${profile.studentId}`);
                  }}
                  className="rounded-full"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy ID
                </Button>
              </div>
            </div>

            {/* Profile Information List */}
            <div className="glass-panel rounded-[2.5rem] p-6 border border-border/60 space-y-4">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Student Profile Details
              </h3>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-xs rounded-2xl bg-muted/40 p-4 border border-border/40">
                <dt className="text-muted-foreground">Full Name</dt>
                <dd className="col-span-2 font-semibold text-foreground">{profile.fullName}</dd>

                <dt className="text-muted-foreground">Student ID</dt>
                <dd className="col-span-2 font-mono font-bold text-primary">{profile.studentId}</dd>

                <dt className="text-muted-foreground">Enrolled Course</dt>
                <dd className="col-span-2 capitalize font-semibold">{profile.course}</dd>

                <dt className="text-muted-foreground">Schedule</dt>
                <dd className="col-span-2 font-medium">{profile.scheduleLabel}</dd>

                <dt className="text-muted-foreground">Email</dt>
                <dd className="col-span-2">{profile.email}</dd>

                <dt className="text-muted-foreground">Phone</dt>
                <dd className="col-span-2 font-mono">{profile.phoneNumber}</dd>

                <dt className="text-muted-foreground">Age & Gender</dt>
                <dd className="col-span-2 capitalize">{profile.age} years · {profile.gender}</dd>

                <dt className="text-muted-foreground">Status</dt>
                <dd className="col-span-2 capitalize">{profile.status}</dd>

                <dt className="text-muted-foreground">Registered Date</dt>
                <dd className="col-span-2">{new Date(profile.registeredAt).toLocaleDateString()}</dd>
              </dl>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: LOG PRACTICE */}
      <Dialog open={openPracticeDialog} onOpenChange={setOpenPracticeDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" /> Log Daily Practice Session
            </DialogTitle>
            <DialogDescription>
              Record your instrument practice minutes to track your momentum.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              practiceMutation.mutate({
                registrationId: profile.id,
                durationMinutes: Number(practiceDuration) || 30,
                notes: practiceNotes.trim() || `${profile.course} practice drills`,
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-2">
              <Label>Practice Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    variant={practiceDuration === mins ? "default" : "outline"}
                    className="rounded-2xl text-xs h-10 font-bold"
                    onClick={() => setPracticeDuration(mins)}
                  >
                    {mins}m
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-duration">Custom Minutes</Label>
              <Input
                id="custom-duration"
                type="number"
                min={5}
                max={480}
                value={practiceDuration}
                onChange={(e) => setPracticeDuration(parseInt(e.target.value, 10) || 15)}
                className="rounded-2xl min-h-11 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="practice-notes">What did you practice today?</Label>
              <Textarea
                id="practice-notes"
                placeholder="e.g. Practiced Hanon finger exercise #1, C and G chord transitions, gospel hymn intro."
                value={practiceNotes}
                onChange={(e) => setPracticeNotes(e.target.value)}
                className="rounded-2xl min-h-20 bg-card text-xs"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" className="rounded-full flex-1" onClick={() => setOpenPracticeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={practiceMutation.isPending} className="rounded-full flex-1 shadow-md">
                {practiceMutation.isPending ? "Logging…" : "Save Practice Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: LINK REGISTRATION */}
      <Dialog open={openLinkDialog} onOpenChange={setOpenLinkDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Link Student Registration
            </DialogTitle>
            <DialogDescription>
              Enter the Student ID (e.g. GMC-2026-0001) or Phone Number you registered with at the academy.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!studentIdInput.trim()) return toast.error("Please enter your Student ID or Phone number.");
              linkMutation.mutate({ studentIdOrPhone: studentIdInput.trim() });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="link-input">Student ID or Registered Phone</Label>
              <Input
                id="link-input"
                placeholder="e.g. GMC-2026-0001 or +251 91 123 4567"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                required
                className="rounded-2xl min-h-11 bg-card"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" className="rounded-full flex-1" onClick={() => setOpenLinkDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={linkMutation.isPending} className="rounded-full flex-1 shadow-md">
                {linkMutation.isPending ? "Linking…" : "Link Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: OFFICIAL PRINTABLE ID CARD */}
      <Dialog open={openIdCardDialog} onOpenChange={setOpenIdCardDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Official Student ID Card
            </DialogTitle>
            <DialogDescription>
              Official credentials card for Glory Music Center students.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-center">
            <div className="w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border-2 border-primary/40 bg-gradient-to-b from-card via-card/95 to-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-400 via-primary to-amber-500" />
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display font-bold text-xl shadow-md">
                  G
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold tracking-tight text-foreground leading-tight">
                    GLORY MUSIC CENTER
                  </h3>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                    Academy of Music & Worship
                  </p>
                  <p className="text-[10px] text-muted-foreground">Bale Robe, Oromia, Ethiopia</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/30 to-amber-400/20 border-2 border-primary/40 font-display text-2xl font-bold text-primary shadow-inner">
                  {initials}
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold shadow">
                    ✓
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Student Name
                  </p>
                  <h4 className="font-display text-lg font-bold text-foreground truncate">
                    {profile.fullName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/30">
                      {profile.studentId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-muted/40 p-3.5 text-xs border border-border/40">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Course</span>
                  <span className="font-semibold capitalize text-foreground">{profile.course}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Status</span>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase px-2 py-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {profile.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Class Schedule</span>
                  <span className="font-medium text-foreground">{profile.scheduleLabel}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Phone</span>
                  <span className="font-mono text-foreground">{profile.phoneNumber}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-border/60 pt-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-0.5 h-6">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3].map((w, idx) => (
                      <div key={idx} className="bg-foreground/70 h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <p className="font-mono text-[9px] tracking-widest text-muted-foreground mt-0.5">{profile.studentId}</p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    <QrCode className="h-3 w-3" /> VERIFIED
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Academic Year 2026</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full flex-1"
              onClick={() => {
                navigator.clipboard.writeText(profile.studentId);
                toast.success(`Copied Student ID ${profile.studentId}`);
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy ID
            </Button>
            <Button
              type="button"
              className="rounded-full flex-1 shadow-md"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" /> Print ID Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
