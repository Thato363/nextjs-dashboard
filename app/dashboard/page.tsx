// export default function Page() {
//   return <p>Dashboard Page</p>;
// }

import { Card } from "@/app/ui/dashboard/cards";
import RevenueChart from "@/app/ui/dashboard/revenue-chart";
import PaymentMethodChart from "@/app/ui/dashboard/payment-method-chart";
import { lusitana } from "@/app/ui/fonts";
import { auth } from "@/auth";
import {
  fetchAppointments,
  fetchMedicalInvoices,
  fetchMedicalRecords,
  fetchPatients,
} from "@/app/lib/data";

function getAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "Age n/a";

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "Age n/a";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} yrs`;
}

function getVisitState(appointment: { start_time: string; end_time: string; status: string }) {
  const now = new Date();
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  if (appointment.status === "completed") {
    return { label: "Checked out", tone: "bg-emerald-100 text-emerald-700" };
  }

  if (start <= now && end >= now) {
    return { label: "Checked in", tone: "bg-sky-100 text-sky-700" };
  }

  if (start < now) {
    return { label: "In progress", tone: "bg-amber-100 text-amber-700" };
  }

  return { label: "Scheduled", tone: "bg-violet-100 text-violet-700" };
}

function StatusBreakdownChart({ appointments }: { appointments: Awaited<ReturnType<typeof fetchAppointments>> }) {
  const counts = {
    scheduled: appointments.filter((appointment) => appointment.status === "scheduled").length,
    checkedIn: appointments.filter((appointment) => getVisitState(appointment).label === "Checked in").length,
    checkedOut: appointments.filter((appointment) => getVisitState(appointment).label === "Checked out").length,
  };

  const total = Math.max(Object.values(counts).reduce((sum, value) => sum + value, 0), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className={`${lusitana.className} text-xl`}>Care flow</h2>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Live</span>
      </div>

      <div className="space-y-4">
        {[
          { label: "Scheduled", value: counts.scheduled, color: "bg-violet-500" },
          { label: "Checked in", value: counts.checkedIn, color: "bg-sky-500" },
          { label: "Checked out", value: counts.checkedOut, color: "bg-emerald-500" },
        ].map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
              <span>{item.label}</span>
              <span className="font-semibold text-slate-800">{item.value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`${item.color} h-full rounded-full`}
                style={{ width: `${(item.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Page() {
  const appointments = await fetchAppointments();
  const medicalInvoices = await fetchMedicalInvoices();
  const medicalRecords = await fetchMedicalRecords();
  const patients = await fetchPatients();

  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  const isDoctor = user?.role === "doctor" || user?.role === "admin";

  const scheduledVisits = appointments.filter((appointment) => appointment.status === "scheduled").length;
  const followUps = appointments.filter((appointment) => appointment.status !== "completed").length;
  const checkedInCount = appointments.filter((appointment) => getVisitState(appointment).label === "Checked in").length;
  const checkedOutCount = appointments.filter((appointment) => getVisitState(appointment).label === "Checked out").length;
  const clinicPatients = patients;
  const livePatientQueue = [...appointments]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 6)
    .map((appointment) => ({
      ...appointment,
      visitState: getVisitState(appointment),
    }));

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-teal-700 via-sky-700 to-cyan-600 p-6 text-white shadow-lg shadow-sky-200/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-teal-100">CareFlow</p>
              <h1 className={`${lusitana.className} mt-2 text-2xl md:text-3xl`}>
                Clinic overview
              </h1>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-sky-50">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Active patients" value={clinicPatients.length} type="customers" />
          <Card title="Scheduled visits" value={scheduledVisits} type="pending" />
          <Card title="Checked in" value={checkedInCount} type="invoices" />
          <Card title="Follow-ups" value={followUps} type="collected" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <RevenueChart appointments={appointments} />
          <StatusBreakdownChart appointments={appointments} />
          <PaymentMethodChart invoices={medicalInvoices} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`${lusitana.className} text-xl`}>Live patient intake board</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{checkedOutCount} checked out</span>
            </div>

            <div className="space-y-3">
              {livePatientQueue.length === 0 && (
                <p className="text-sm text-slate-500">No appointment activity yet.</p>
              )}

              {livePatientQueue.map((appointment) => (
                <div key={appointment.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{appointment.patient_name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(appointment.start_time).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })} • {appointment.doctor_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${appointment.visitState.tone}`}>
                      {appointment.visitState.label}
                    </span>
                    <span className="text-xs text-slate-500">{appointment.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className={`${lusitana.className} text-xl`}>Clinical notes</h2>
            <div className="mt-4 space-y-3">
              {medicalRecords.slice(0, 4).map((record) => (
                <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{record.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{record.patient_name} • {record.doctor_name}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{record.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isDoctor && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`${lusitana.className} text-xl`}>Patient roster</h2>
              <span className="text-sm text-slate-500">{clinicPatients.length} active records</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clinicPatients.map((patient) => (
                <div key={patient.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`${lusitana.className} text-base font-semibold text-slate-800`}>{patient.full_name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{patient.phone ?? "No phone on file"}</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      {getAge(patient.date_of_birth)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>DOB</span>
                      <span className="font-medium text-slate-800">{patient.date_of_birth ?? "n/a"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Gender</span>
                      <span className="font-medium capitalize text-slate-800">{patient.gender?.replaceAll("-", " ") ?? "Not recorded"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last visit</span>
                      <span className="font-medium text-slate-800">{appointments.find((appointment) => appointment.patient_name === patient.full_name)?.start_time ? new Date(appointments.find((appointment) => appointment.patient_name === patient.full_name)!.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                    </div>
                  </div>

                  <a
                    href={`/dashboard/patients/${patient.id}/appointments`}
                    className="mt-4 inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  >
                    View schedule
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
