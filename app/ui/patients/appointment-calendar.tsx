"use client";

import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { lusitana } from "@/app/ui/fonts";
import { type Appointment } from "@/app/lib/data";

type CalendarView = "month" | "week" | "day";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isToday(date: Date): boolean {
  return isSameDay(date, startOfDay(new Date()));
}

function isPast(date: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getWeek(date: Date): Date[] {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function AppointmentCalendar({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>("month");

  const monthDates = getWeeks(currentMonth).flat();
  const visibleDates = view === "month"
    ? monthDates
    : view === "week"
      ? getWeek(selectedDate)
      : [selectedDate];
  const selectedAppointments = appointments
    .filter((appointment) => isSameDay(new Date(appointment.start_time), selectedDate))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  function shiftPeriod(direction: -1 | 1) {
    const next = new Date(selectedDate);
    if (view === "month") {
      next.setMonth(next.getMonth() + direction, 1);
    } else if (view === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
    }

    if (isPast(next)) return;

    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setSelectedDate(next);
  }

  function handleToday() {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function appointmentTone(status: string) {
    if (status === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "checked_in") return "bg-sky-100 text-sky-800 border-sky-200";
    if (status === "cancelled" || status === "no_show") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-violet-100 text-violet-800 border-violet-200";
  }

  const heading = view === "day"
    ? formatLong(selectedDate)
    : view === "week"
      ? `${formatLong(visibleDates[0]!)} – ${visibleDates[6]!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : formatMonthYear(currentMonth);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-slate-200">
            <button type="button" onClick={() => shiftPeriod(-1)} className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-teal-700" aria-label="Previous period">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleToday} className="h-9 border-x border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
            <button type="button" onClick={() => shiftPeriod(1)} className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-teal-700" aria-label="Next period">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <h2 className={`${lusitana.className} min-w-40 text-lg text-slate-800 md:text-xl`}>{heading}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md border border-slate-200 p-0.5" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={classNames(
                  "rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === option ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <CalendarDaysIcon className="hidden h-5 w-5 text-teal-700 sm:block" />
        </div>
      </div>

      {view !== "day" && (
        <div className="grid grid-cols-7 border-b border-slate-200 bg-teal-700 text-center text-[10px] font-semibold uppercase tracking-wide text-white sm:text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2.5">{day}</div>
          ))}
        </div>
      )}

      {view === "day" ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 12 }, (_, index) => index + 8).map((hour) => {
            const hourAppointments = selectedAppointments.filter((appointment) => new Date(appointment.start_time).getHours() === hour);
            return (
              <div key={hour} className="grid min-h-16 grid-cols-[4rem_1fr] sm:grid-cols-[6rem_1fr]">
                <div className="border-r border-slate-100 px-3 py-3 text-right text-xs text-slate-400">{new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" })}</div>
                <div className="space-y-1 p-2">
                  {hourAppointments.map((appointment) => (
                    <div key={appointment.id} className={`rounded border px-3 py-2 text-xs ${appointmentTone(appointment.status)}`}>
                      <span className="font-semibold">{formatTime(appointment.start_time)} · {appointment.patient_name}</span>
                      <span className="ml-2">{appointment.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {visibleDates.map((day) => {
            const dayAppointments = appointments
              .filter((appointment) => isSameDay(new Date(appointment.start_time), day))
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            const outsideMonth = view === "month" && !isSameMonth(day, currentMonth);
            const selected = isSameDay(day, selectedDate);
            const past = isPast(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={past}
                onClick={() => handleDateSelect(day)}
                aria-label={`${formatLong(day)}${dayAppointments.length ? `, ${dayAppointments.length} appointments` : ""}`}
                className={classNames(
                  "min-h-28 border-b border-r border-slate-200 p-1.5 text-left transition-colors sm:min-h-36 sm:p-2",
                  outsideMonth && "bg-slate-50/70",
                  past && "cursor-not-allowed bg-slate-100 text-slate-300",
                  selected && "bg-teal-50/60",
                  !selected && !past && "hover:bg-slate-50",
                )}
              >
                <span className={classNames(
                  "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs",
                  past || outsideMonth ? "text-slate-300" : "text-slate-600",
                  isToday(day) && "bg-teal-700 font-bold text-white",
                )}>
                  {day.getDate()}
                </span>
                <span className="flex flex-col gap-1">
                  {dayAppointments.slice(0, 2).map((appointment) => (
                    <span key={appointment.id} className={`truncate rounded border px-1.5 py-1 text-left text-[9px] leading-tight sm:text-[10px] ${appointmentTone(appointment.status)}`}>
                      <span className="font-semibold">{formatTime(appointment.start_time)}</span> {appointment.patient_name}
                    </span>
                  ))}
                  {dayAppointments.length > 2 && (
                    <span className="px-1 text-[9px] font-medium text-slate-500">+{dayAppointments.length - 2} more</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 md:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{formatLong(selectedDate)}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{selectedAppointments.length} appointment{selectedAppointments.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 sm:text-xs">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Scheduled</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />Checked in</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Complete</span>
          </div>
        </div>
        {selectedAppointments.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">No appointments scheduled for this day.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{appointment.patient_name}</p>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${appointmentTone(appointment.status)}`}>{appointment.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{formatTime(appointment.start_time)}–{formatTime(appointment.end_time)} · {appointment.doctor_name}</p>
                <p className="mt-1 text-xs text-slate-500">{appointment.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
