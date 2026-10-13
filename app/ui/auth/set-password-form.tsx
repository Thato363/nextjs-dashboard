'use client';

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function SetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    return createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        flowType: "pkce",
      },
    });
  }, []);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvitationSession() {
      if (!supabase) {
        if (active) {
          setMessage("Clinician account setup is unavailable. Contact the clinic administrator.");
          setReady(true);
        }
        return;
      }

      const currentUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
      const callbackType = currentUrl.searchParams.get("type") ?? hashParams.get("type");
      const cameFromAuthEmail =
        currentUrl.searchParams.has("code") ||
        callbackType === "invite" ||
        callbackType === "recovery";
      if (!cameFromAuthEmail) {
        if (active) {
          setMessage("Open this page from your secure invitation or password reset email to continue.");
          setReady(true);
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error) {
        setMessage("This link has expired or was already used. Request another password reset or ask the clinic to resend your invitation.");
      } else if (!data.user) {
        setMessage("We could not verify this link. Request another password reset or ask the clinic to resend your invitation.");
      }
      setHasSession(Boolean(data.user));
      setReady(true);
    }

    void loadInvitationSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirm_password") ?? "");
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setPending(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("We could not update your password. Open a fresh email link or contact the clinic administrator.");
      setPending(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return (
    <form onSubmit={savePassword} className="mt-6 space-y-4">
      {ready && hasSession ? (
        <>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="password">
            New password
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="confirm-password">
            Confirm password
            <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" />
          </label>
          <button type="submit" disabled={pending} className="w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Saving password…" : "Set password and continue"}
          </button>
        </>
      ) : (
        !ready && <p className="text-sm text-slate-500">Checking your invitation…</p>
      )}
      {message && <p role="status" aria-live="polite" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}
    </form>
  );
}
