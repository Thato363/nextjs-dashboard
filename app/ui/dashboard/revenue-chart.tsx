import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import type { Appointment } from "@/app/lib/data";

function getMonthlyVisits(appointments: Appointment[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const count = appointments.filter((appointment) => {
      const start = new Date(appointment.start_time);
      return start.getFullYear() === month.getFullYear() && start.getMonth() === month.getMonth();
    }).length;

    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      count,
    };
  });
}

export default function RevenueChart({ appointments }: { appointments: Appointment[] }) {
  const months = getMonthlyVisits(appointments);
  const maximum = Math.max(...months.map((month) => month.count), 1);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Appointments</p>
          <h2 className={`${lusitana.className} mt-1 text-xl text-slate-900`}>Visit volume</h2>
          <p className="mt-1 text-xs text-slate-500">Visits booked over the last six months</p>
        </div>
        <CalendarDaysIcon className="h-5 w-5 text-teal-700" />
      </div>

      <div className="grid h-52 min-w-0 grid-cols-6 items-end gap-2 border-b border-slate-200 px-1 pb-2 sm:gap-3">
        {months.map((month) => (
          <div key={`${month.label}-${month.count}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
            <span className="text-xs font-semibold tabular-nums text-slate-600">{month.count}</span>
            <div className="flex h-36 w-full items-end rounded-t-md bg-slate-50">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-teal-700 to-cyan-400 transition-[height]"
                style={{ height: `${month.count === 0 ? 3 : Math.max((month.count / maximum) * 100, 8)}%` }}
                title={`${month.count} visits`}
              />
            </div>
            <span className="text-[11px] text-slate-500 sm:text-xs">{month.label}</span>
          </div>
        ))}
      </div>
      {appointments.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Appointment activity will appear as visits are booked.</p>
      )}
    </section>
  );
}

