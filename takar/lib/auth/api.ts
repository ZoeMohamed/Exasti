import { NextResponse, type NextRequest } from "next/server";
import { getCurrentBusinessId, isAuthRequiredError } from "./context";

export async function requireApiBusinessId(): Promise<string> {
  return getCurrentBusinessId();
}

export function apiError(error: unknown, fallback: string) {
  if (isAuthRequiredError(error)) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Endpoint pekerjaan sistem wajib gagal tertutup bila rahasia belum dipasang. */
export function authorizeSystemRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum dikonfigurasi di server." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 401 });
  }
  return null;
}
