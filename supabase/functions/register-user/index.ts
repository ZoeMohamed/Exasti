import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveNamedKeys(configName: string, fallbackNames: string[]): string[] {
  const keys: string[] = [];
  const rawConfig = Deno.env.get(configName);

  if (rawConfig) {
    try {
      const configured = JSON.parse(rawConfig) as Record<string, string>;
      for (const value of Object.values(configured)) {
        const resolved = Deno.env.get(value) ?? value;
        if (resolved) keys.push(resolved);
      }
    } catch {
      // Older projects expose individual key variables instead of a JSON map.
    }
  }

  for (const name of fallbackNames) {
    const value = Deno.env.get(name);
    if (value) keys.push(value);
  }

  return [...new Set(keys)];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ message: "Cara akses tidak didukung." }, 405);
  }

  const publishableKeys = resolveNamedKeys("SUPABASE_PUBLISHABLE_KEYS", [
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  const authorization = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const presentedKey = request.headers.get("apikey") ?? authorization;

  if (!presentedKey || !publishableKeys.includes(presentedKey)) {
    return jsonResponse({ message: "Permintaan tidak dikenali." }, 401);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 4096) {
    return jsonResponse({ message: "Data pendaftaran terlalu besar." }, 413);
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Isi email dan kata sandi dengan benar." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length > 254 || !emailPattern.test(email)) {
    return jsonResponse({ message: "Format email belum benar." }, 400);
  }

  if (password.length < 8 || password.length > 72) {
    return jsonResponse({ message: "Kata sandi harus 8 sampai 72 karakter." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = resolveNamedKeys("SUPABASE_SECRET_KEYS", [
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])[0];

  if (!supabaseUrl || !secretKey) {
    return jsonResponse({ message: "Pendaftaran sedang belum tersedia." }, 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const duplicate =
      error.code === "email_exists" || /already (been )?registered|already exists/i.test(error.message);
    return jsonResponse(
      {
        message: duplicate
          ? "Email ini sudah terdaftar. Silakan pilih Masuk."
          : "Akun belum bisa dibuat. Coba lagi sebentar.",
      },
      duplicate ? 409 : 400,
    );
  }

  return jsonResponse({ ok: true }, 201);
});
