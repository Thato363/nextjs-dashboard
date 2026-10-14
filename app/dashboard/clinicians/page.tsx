import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchDoctors } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";
import DoctorProfileForm from "@/app/ui/doctors/doctor-profile-form";

export default async function CliniciansPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "doctor") redirect("/dashboard/my-care");

  const doctors = await fetchDoctors();

  return (
    <main className="mx-auto w-full max-w-7xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Access and directory</p>
        <h1 className={`${lusitana.className} mt-1 text-2xl text-slate-900 md:text-3xl`}>Care team</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Every clinician uses an individual login. Linked clinicians receive admin access to clinic workflows and patient records.
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Clinician profiles</h2>
            <p className="mt-1 text-xs text-slate-500">{doctors.length} active clinic admin{doctors.length === 1 ? "" : "s"}</p>
          </div>
          {doctors.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No clinician profiles are linked yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {doctors.map((doctor) => (
                <li key={doctor.id} className="flex min-w-0 flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{doctor.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{doctor.specialty || "Specialty not recorded"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {doctor.practice_number && <span className="text-xs text-slate-500">Reg. {doctor.practice_number}</span>}
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">Admin</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DoctorProfileForm />
      </div>
    </main>
  );
}

