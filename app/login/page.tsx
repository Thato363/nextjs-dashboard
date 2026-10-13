import ClinicLogo from "@/app/ui/clinic-logo";
import LoginForm from "@/app/ui/login-form";
import { Suspense } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
      <section className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-[#0b3d46] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-white/10" />
        <ClinicLogo light />
        <div className="relative z-10 my-10 max-w-xl lg:my-auto lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Clinic operations</p>
          <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">
            Good care starts with a clear picture.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-200 sm:text-base">
            Bring appointments, patient records, and daily clinic activity together in one secure workspace.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-teal-100">
          <ShieldCheckIcon className="h-5 w-5" />
          <span>Secure access for patients and care teams</span>
        </div>
      </section>

      <section className="flex min-h-[70vh] items-center justify-center px-5 py-12 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <ClinicLogo />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Patient & staff sign in</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your personal care or clinic workspace.</p>
          <div className="mt-7">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
