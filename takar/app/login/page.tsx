"use client";

import { useState, type FormEvent } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

async function getRegistrationErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const payload = await error.context.json().catch(() => null);
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }
  }

  return "Akun belum bisa dibuat. Coba lagi sebentar.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "daftar") {
        const { error: registrationError } = await supabase.functions.invoke("register-user", {
          body: { email, password },
        });
        if (registrationError) {
          setMessage(await getRegistrationErrorMessage(registrationError));
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setMessage(
          mode === "daftar"
            ? "Akun sudah dibuat, tetapi belum bisa masuk. Coba tekan Masuk."
            : "Email atau kata sandi belum cocok.",
        );
        return;
      }

      const next = new URL(window.location.href).searchParams.get("next");
      const tujuan = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

      // Sesudah daftar, akun dibuat oleh Edge Function lalu sesi ditulis oleh
      // supabase-js ke cookie browser. Navigasi App Router dapat meminta RSC
      // sebelum cookie itu terlihat oleh proxy, lalu proxy mengirim pengguna
      // kembali ke /login. Muat dokumen baru agar cookie selesai tersimpan dan
      // permintaan pertama ke dashboard membawa sesi yang baru dibuat.
      window.location.replace(tujuan);
    } catch {
      setMessage("Koneksi sedang bermasalah. Coba lagi sebentar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-4">
      <section className="w-full max-w-md bg-white p-6 brutal-card sm:p-8">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-warning-yellow font-heading text-xl font-black brutal-border-2">
          T.
        </div>
        <p className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-ink/60">
          Catatan warungmu
        </p>
        <h1 className="mt-1 font-heading text-4xl font-extrabold">
          {mode === "masuk" ? "Masuk ke Takar" : "Buat akun Takar"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Setiap akun hanya dapat melihat dan mengubah data warung miliknya sendiri.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block font-heading text-sm font-bold">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full bg-cream p-3 font-mono brutal-border-2"
              placeholder="nama@email.com"
            />
            {mode === "daftar" ? (
              <span className="mt-1 block text-xs font-medium text-ink/60">
                Boleh Gmail, Yahoo, atau email lain. Tidak perlu verifikasi email.
              </span>
            ) : null}
          </label>
          <label className="block font-heading text-sm font-bold">
            Kata sandi
            <input
              required
              minLength={8}
              type="password"
              autoComplete={mode === "masuk" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full bg-cream p-3 font-mono brutal-border-2"
              placeholder="Minimal 8 karakter"
            />
          </label>

          {message ? (
            <p role="status" className="bg-warning-yellow/30 p-3 text-sm font-semibold brutal-border-2">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="brutal-btn min-h-11 w-full bg-ink px-5 py-3 font-heading font-extrabold text-cream disabled:opacity-60"
          >
            {pending ? "Memeriksa…" : mode === "masuk" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "masuk" ? "daftar" : "masuk"));
            setMessage(null);
          }}
          className="mt-4 min-h-11 w-full text-sm font-bold underline underline-offset-4"
        >
          {mode === "masuk" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </section>
    </main>
  );
}
