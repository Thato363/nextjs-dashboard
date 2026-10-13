import { fetchAppointments, fetchMedicalInvoices, fetchMedicalRecords, fetchPatientById } from "@/app/lib/data";
import { ClipboardDocumentIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import Link from "next/link";

export default async function MedicalRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, medicalRecords, appointments, invoices] = await Promise.all([
    fetchPatientById(id),
    fetchMedicalRecords(),
    fetchAppointments(),
    fetchMedicalInvoices(),
  ]);

  const patientRecords = medicalRecords.filter((record) => record.patient_id === id);
  const patientAppointments = appointments.filter((appointment) => appointment.patient_id === id);
  const patientInvoices = invoices.filter((invoice) => invoice.patient_id === id);
  const history = [
    ...patientRecords.map((record) => ({
      id: record.id,
      kind: "record" as const,
      date: record.created_at,
      title: record.title,
      category: record.record_type.replaceAll("_", " "),
      details: record.summary,
      clinician: record.doctor_name,
    })),
    ...patientAppointments.map((appointment) => ({
      id: appointment.id,
      kind: "appointment" as const,
      date: appointment.start_time,
      title: appointment.reason,
      category: `Appointment · ${appointment.status.replaceAll("_", " ")}`,
      details: `${new Date(appointment.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}–${new Date(appointment.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      clinician: appointment.doctor_name,
    })),
    ...patientInvoices.map((invoice) => ({
      id: invoice.id,
      kind: "billing" as const,
      date: invoice.issued_at,
      title: invoice.service_description,
      category: `Billing · ${invoice.payment_method.replaceAll("_", " ")} · ${invoice.payment_status}`,
      details: `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(invoice.amount))}${invoice.medical_aid_provider ? ` · ${invoice.medical_aid_provider}` : ""}${invoice.reference_number ? ` · Ref ${invoice.reference_number}` : ""}`,
      clinician: invoice.doctor_name,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!patient) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Patient not found.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl">
      <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Patient chart</p>
            <h1 className={`${lusitana.className} mt-1 text-2xl text-slate-900`}>{patient.full_name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              DOB: {patient.date_of_birth ?? "Not recorded"} <span className="mx-1 text-slate-300">·</span>
              Email: {patient.email} <span className="mx-1 text-slate-300">·</span>
              Gender: {patient.gender?.replaceAll("-", " ") ?? "Not recorded"} <span className="mx-1 text-slate-300">·</span>
              Phone: {patient.phone ?? "Not recorded"}
            </p>
          </div>
          <Link href={`/dashboard/appointments/new?patientId=${patient.id}`} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
            <CalendarDaysIcon className="h-4 w-4" /> Book visit
          </Link>
        </div>
      </header>

      <section aria-labelledby="history-heading">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="history-heading" className={`${lusitana.className} text-xl text-slate-900`}>Medical history</h2>
            <p className="mt-1 text-sm text-slate-500">Visits, clinical notes, results, and billing entries in chronological order.</p>
          </div>
          <span className="text-xs text-slate-500">{history.length} entries</span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <ClipboardDocumentIcon className="mx-auto h-8 w-8 text-teal-700" />
            <p className="mt-3 text-sm font-medium text-slate-800">No medical history recorded</p>
            <p className="mt-1 text-sm text-slate-500">Appointments, clinical notes, and billing entries will appear here.</p>
          </div>
        ) : (
          <ol className="relative ml-3 space-y-3 border-l border-slate-200 pl-5">
            {history.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`} className="relative rounded-lg border border-slate-200 bg-white p-4">
                <span className={`absolute -left-[1.62rem] top-5 h-3 w-3 rounded-full border-2 border-white ${entry.kind === "appointment" ? "bg-sky-600" : entry.kind === "billing" ? "bg-amber-500" : "bg-teal-700"}`} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-xs capitalize text-teal-800">{entry.category} <span className="text-slate-400">·</span> {entry.clinician}</p>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={entry.date}>
                    {new Date(entry.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.details}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
