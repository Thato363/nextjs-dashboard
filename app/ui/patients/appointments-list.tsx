import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import { type Appointment } from "@/app/lib/data";

function formatAppointmentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AppointmentsList({
  appointments,
  patientName,
}: {
  appointments: Appointment[];
  patientName: string;
}) {
  return (
    <div className="w-full rounded-xl bg-gray-50 p-4">
      <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        {patientName}&apos;s Appointments
      </h2>

      {appointments.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">No appointments scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {appointment.patient_name}
                  </p>
                  <p className="text-xs text-gray-500">{appointment.doctor_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" />
                  {formatAppointmentDate(appointment.start_time)}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  appointment.status === "scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : appointment.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                }`}>
                  {appointment.status}
                </span>
                <span className="text-xs text-gray-400">{appointment.reason}</span>
              </div>

              <Link
                href={`/dashboard/appointments/${appointment.id}/edit`}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
              >
                Edit
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

