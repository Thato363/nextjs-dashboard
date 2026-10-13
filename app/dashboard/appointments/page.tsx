import { fetchAppointments } from "@/app/lib/data";
import AppointmentCalendar from "@/app/ui/patients/appointment-calendar";
import { lusitana } from "@/app/ui/fonts";
import Link from "next/link";

export default async function AppointmentsPage() {
  const appointments = await fetchAppointments();

  return (
    <main className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Care coordination</p>
          <h1 className={`${lusitana.className} mt-1 text-2xl text-slate-900 md:text-3xl`}>Calendar</h1>
        </div>
        <Link
          href="/dashboard/appointments/new"
          className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
        >
          <span aria-hidden="true">+</span>
          Book appointment
        </Link>
      </div>

      <AppointmentCalendar appointments={appointments} />
    </main>
  );
}
