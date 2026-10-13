import Link from "next/link";
import { CalendarDaysIcon, ClipboardDocumentListIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { auth } from "@/auth";
import { fetchAppointments, fetchMedicalInvoices, fetchMedicalRecords, fetchPatients } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";

function formatAmount(value: number) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export default async function MyCarePage() {
  const [session, patients, appointments, invoices, records] = await Promise.all([
    auth(),
    fetchPatients(),
    fetchAppointments(),
    fetchMedicalInvoices(),
    fetchMedicalRecords(),
  ]);

  const patientIds = new Set(patients.map((patient) => patient.id));
  const ownAppointments = appointments.filter((appointment) => patientIds.has(appointment.patient_id));
  const ownInvoices = invoices.filter((invoice) => patientIds.has(invoice.patient_id));
  const ownRecords = records.filter((record) => patientIds.has(record.patient_id));
  const now = Date.now();
  const upcoming = ownAppointments
    .filter((appointment) => new Date(appointment.start_time).getTime() >= now && appointment.status !== "cancelled")
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);
  const patientName = patients[0]?.full_name ?? session?.user?.name ?? "Patient";
  const outstanding = ownInvoices
    .filter((invoice) => invoice.payment_status === "pending")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <main className="mx-auto w-full max-w-6xl">
      <header className="mb-6 rounded-xl bg-gradient-to-r from-teal-800 to-cyan-700 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100">Patient portal</p>
        <h1 className={`${lusitana.className} mt-2 text-2xl md:text-3xl`}>Welcome, {patientName}</h1>
        <p className="mt-2 text-sm text-teal-50">Your appointments, care history, and payment updates in one place.</p>
      </header>

      {patients.length === 0 ? (
        <section className="rounded-lg border border-amber-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Your patient profile is not linked yet</h2>
          <p className="mt-1 text-sm text-slate-600">Ask your clinic to connect your sign-in to your patient record.</p>
        </section>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Summary icon={<CalendarDaysIcon className="h-5 w-5" />} label="Upcoming appointments" value={upcoming.length.toString()} detail="Scheduled for you" />
            <Summary icon={<CreditCardIcon className="h-5 w-5" />} label="Outstanding balance" value={formatAmount(outstanding)} detail="Pending billing records" />
            <Summary icon={<ClipboardDocumentListIcon className="h-5 w-5" />} label="Care history" value={ownRecords.length.toString()} detail="Clinical notes and results" />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Upcoming appointments</h2>
                  <p className="mt-1 text-xs text-slate-500">Your next scheduled visits</p>
                </div>
                <Link href="/dashboard/appointments/new" className="rounded-md bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900">Book visit</Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500">You have no upcoming appointments.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((appointment) => (
                    <li key={appointment.id} className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{appointment.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(appointment.start_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {appointment.doctor_name}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Recent care and billing</h2>
                <p className="mt-1 text-xs text-slate-500">Your latest clinical notes and payment activity</p>
              </div>
              {[...ownRecords.map((record) => ({ id: `record-${record.id}`, at: record.created_at, title: record.title, detail: record.summary, kind: "Clinical record" })), ...ownInvoices.map((invoice) => ({ id: `invoice-${invoice.id}`, at: invoice.issued_at, title: invoice.service_description, detail: `${formatAmount(Number(invoice.amount))} · ${invoice.payment_method.replaceAll("_", " ")} · ${invoice.payment_status}${invoice.medical_aid_provider ? ` · ${invoice.medical_aid_provider}` : ""}`, kind: "Billing" }))]
                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                .slice(0, 6)
                .map((item) => (
                  <article key={item.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-teal-700">{item.kind}</span>
                    </div>
                  </article>
                ))}
              {ownRecords.length === 0 && ownInvoices.length === 0 && <p className="px-5 py-8 text-sm text-slate-500">Your care history will appear here.</p>}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-teal-800">{icon}<p className="text-sm font-medium text-slate-600">{label}</p></div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </section>
  );
}
