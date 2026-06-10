import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
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
      { title: "Lunavx — AI Workforce for Local Businesses" },
     { name: "description", content: "8-agent AI workforce for HVAC, plumbing, roofing, cleaning, and local service businesses." },
      { name: "author", content: "Lunavx" },
     { property: "og:title", content: "Lunavx — AI Workforce for Local Businesses" },
      { property: "og:description", content: "8-agent AI workforce for HVAC, plumbing, roofing, cleaning, and local service businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lunavx" },
      { name: "twitter:title", content: "Lunavx — AI Workforce for Local Businesses" },
      { name: "twitter:description", content: "AI-powered marketing tool to generate business content like reviews, captions, and promos." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b8d42ce-c965-4b51-a5ce-c2764e73006e/id-preview-6cbffd8d--c8f90bbe-9035-4ead-91d9-5e84562d5941.lovable.app-1778012401460.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b8d42ce-c965-4b51-a5ce-c2764e73006e/id-preview-6cbffd8d--c8f90bbe-9035-4ead-91d9-5e84562d5941.lovable.app-1778012401460.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
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
    </QueryClientProvider>
  );
}
