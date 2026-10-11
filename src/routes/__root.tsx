import type { ErrorComponentProps } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-display text-4xl text-foreground">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">The page you are looking for could not be found.</p>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "root" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <p className="eyebrow">Error</p>
        <h1 className="mt-4 font-display text-4xl text-foreground">Something went wrong</h1>
        <p className="mt-3 max-w-md text-muted-foreground">Please try again or return to the homepage.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Glory Music Center | Premium Music Academy" },
      { name: "description", content: "Glory Music Center is a premium music academy in Bale Robe, Oromia, Ethiopia offering piano, keyboard, guitar, and saxophone training for children, youth, and adults." },
      { property: "og:title", content: "Glory Music Center | Premium Music Academy" },
      { property: "og:description", content: "Glory Music Center is a premium music academy in Bale Robe, Oromia, Ethiopia offering piano, keyboard, guitar, and saxophone training for children, youth, and adults." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Glory Music Center | Premium Music Academy" },
      { name: "twitter:description", content: "Glory Music Center is a premium music academy in Bale Robe, Oromia, Ethiopia offering piano, keyboard, guitar, and saxophone training for children, youth, and adults." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dWKhwlS2ofYOqJar5PxnxoOmr9k2/social-images/social-1781528468414-ChatGPT_Image_Jun_15,_2026,_04_00_57_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/dWKhwlS2ofYOqJar5PxnxoOmr9k2/social-images/social-1781528468414-ChatGPT_Image_Jun_15,_2026,_04_00_57_PM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "canonical", href: "/" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `(() => { try { const s = localStorage.getItem('glory-theme'); const dark = s ? s === 'dark' : true; document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch (e) { document.documentElement.classList.add('dark'); } })();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
