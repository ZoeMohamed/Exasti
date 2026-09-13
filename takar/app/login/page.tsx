"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const supabase = createClient();
    if (mode === "daftar") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      setPending(false);
      setMessage(
        error
          ? error.message
          : "Cek emailmu untuk mengaktifkan akun, lalu kembali masuk ke Takar.",
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      setMessage("Email atau kata sandi belum cocok.");
      return;
    }

    const next = new URL(window.location.href).searchParams.get("next");
    router.replace(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
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
              placeholder="kamu@warung.id"
            />
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
