import Link from "next/link";
import ForgotPasswordForm from "@/app/ui/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">CareFlow account access</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the email address for your account. We will send a secure link if an account matches it.
        </p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-teal-800 hover:underline">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
