import { HeartIcon } from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import type { MedicalVitals } from "@/app/lib/data";

function show(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value)}${suffix}`;
}

function bloodPressure(reading: MedicalVitals) {
  if (reading.systolic_pressure === null || reading.diastolic_pressure === null) return "—";
  return `${reading.systolic_pressure}/${reading.diastolic_pressure}`;
}

// `vitals` arrives newest-first, so the first reading seen for a patient is their latest.
function latestPerPatient(vitals: MedicalVitals[]) {
  const seen = new Set<string>();
  return vitals.filter((reading) => {
    if (seen.has(reading.patient_id)) return false;
    seen.add(reading.patient_id);
    return true;
  });
}

export default function LatestVitals({
  vitals,
  patientNames,
}: {
  vitals: MedicalVitals[];
  patientNames: Map<string, string>;
}) {
  const latest = latestPerPatient(vitals).slice(0, 5);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Patient vitals</p>
          <h2 className={`${lusitana.className} mt-1 text-xl text-slate-900`}>Latest readings</h2>
        </div>
        <HeartIcon className="h-5 w-5 text-teal-700" />
      </div>

      {latest.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Vitals recorded during a visit will appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {latest.map((reading) => (
            <div key={reading.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {patientNames.get(reading.patient_id) ?? "Unknown patient"}
                </p>
                <time className="shrink-0 text-xs text-slate-500" dateTime={reading.timestamp}>
                  {new Date(reading.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>

              <dl className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">BP</dt>
                  <dd className="font-semibold tabular-nums text-slate-800">{bloodPressure(reading)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pulse</dt>
                  <dd className="font-semibold tabular-nums text-slate-800">{show(reading.heart_rate, " bpm")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Temp</dt>
                  <dd className="font-semibold tabular-nums text-slate-800">{show(reading.temperature, "°C")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Weight</dt>
                  <dd className="font-semibold tabular-nums text-slate-800">{show(reading.weight_kg, " kg")}</dd>
                </div>
              </dl>

              {reading.notes && <p className="mt-2 text-xs leading-5 text-slate-600">{reading.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
