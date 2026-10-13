'use client';

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ForgotPasswordForm() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  }, []);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Password recovery is unavailable right now. Contact the clinic administrator.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return;

    setPending(true);
    setMessage("");
    const redirectTo = new URL("/auth/set-password", window.location.origin).toString();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        console.error("Failed to request password reset:", error);
        setMessage("We could not send the reset email. Check the app's Supabase Auth redirect settings, then try again.");
        return;
      }

      setSent(true);
    } catch (error) {
      console.error("Failed to request password reset:", error);
      setMessage("We could not send the reset email right now. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={requestPasswordReset} className="mt-6 space-y-4">
      {sent ? (
        <p role="status" aria-live="polite" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
          If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.
        </p>
      ) : (
        <>
          <label htmlFor="email" className="grid gap-2 text-sm font-medium text-slate-700">
            Account email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-md border border-slate-300 px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-teal-800 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Sending link…" : "Send reset link"}
          </button>
        </>
      )}
      {message && <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}
    </form>
  );
}
