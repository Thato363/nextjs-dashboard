'use client';

import { useActionState } from "react";
import { addDoctorProfile } from "@/app/lib/actions";

export default function DoctorProfileForm() {
  const [state, formAction, pending] = useActionState(addDoctorProfile, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Add a clinician profile</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          Use a separate email for each clinician. Existing Supabase Auth accounts are linked; new accounts receive an invitation to set their own password.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="doctor-email">
          Clinician email
          <input id="doctor-email" name="email" type="email" required autoComplete="email" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" placeholder="doctor@clinic.org" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="doctor-name">
          Clinician name
          <input id="doctor-name" name="full_name" required minLength={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" placeholder="Dr Alex Ndlovu" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="doctor-specialty">
          Specialty
          <input id="doctor-specialty" name="specialty" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" placeholder="Family medicine" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="doctor-practice-number">
          Registration number
          <input id="doctor-practice-number" name="practice_number" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" placeholder="Optional" />
        </label>
      </div>

      {state?.message && (
        <p role="status" aria-live="polite" className={`rounded-md px-3 py-2 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Sending invitation…" : "Invite clinician as admin"}
      </button>
    </form>
  );
}

