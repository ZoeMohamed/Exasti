import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isDemoMode } from "./config";

const PUBLIC_PATHS = ["/login", "/auth", "/api/health", "/api/cron/harian", "/api/ingest"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headersToSet)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (claims && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
