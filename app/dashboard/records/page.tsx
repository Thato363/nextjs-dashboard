import Link from "next/link";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { fetchMedicalRecords } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";

export default async function RecordsPage() {
  const records = await fetchMedicalRecords();

  return (
    <main className="mx-auto w-full max-w-7xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Patient care</p>
        <h1 className={`${lusitana.className} mt-1 text-2xl text-slate-900 md:text-3xl`}>Medical records</h1>
        <p className="mt-2 text-sm text-slate-500">Clinical notes, diagnoses, prescriptions, and results across your patient list.</p>
      </header>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <ClipboardDocumentIcon className="mx-auto h-8 w-8 text-teal-700" />
          <p className="mt-3 text-sm font-medium text-slate-800">No medical history has been recorded yet.</p>
          <p className="mt-1 text-sm text-slate-500">Patient notes and results will appear here as they are added.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {records.map((record) => (
            <article key={record.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start md:px-5">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50">
                  <ClipboardDocumentIcon className="h-5 w-5 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">{record.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    <Link href={`/dashboard/patients/${record.patient_id}/medical-records`} className="font-medium text-teal-800 hover:underline">
                      {record.patient_name}
                    </Link>
                    <span> · {record.record_type.replaceAll("_", " ")} · {record.doctor_name}</span>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{record.summary}</p>
                </div>
              </div>
              <time className="text-xs text-slate-500 md:text-right" dateTime={record.created_at}>
                {new Date(record.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}