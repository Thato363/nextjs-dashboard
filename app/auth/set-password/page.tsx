import Link from "next/link";
import { lusitana } from "@/app/ui/fonts";
import SetPasswordForm from "@/app/ui/auth/set-password-form";

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">CareFlow clinic access</p>
        <h1 className={`${lusitana.className} mt-2 text-2xl text-slate-900`}>Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose a password for your individual clinician account. You will use it with your email to sign in.
        </p>
        <SetPasswordForm />
        <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-teal-800 hover:underline">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}

