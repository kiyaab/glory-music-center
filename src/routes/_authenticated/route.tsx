import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { getClientAdminSession } from "@/lib/auth-admin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const adminSession = getClientAdminSession();
    if (adminSession) {
      return {
        user: {
          id: adminSession.id,
          email: adminSession.email,
          user_metadata: { full_name: adminSession.fullName, role: "admin" },
        },
      };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
