import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'
import { getClientAdminSession } from '@/lib/auth-admin'

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const adminSession = getClientAdminSession();
    if (adminSession?.token) {
      return next({
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
    }

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
