"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/ui/button";
import { lusitana } from "@/app/ui/fonts";

type FormState = {
  message: string | null;
  errors: {
    patient_id?: string[];
    doctor_id?: string[];
    start_time?: string[];
    end_time?: string[];
    reason?: string[];
  };
};

type AppointmentFormProps = {
  initialPatientId?: string;
  patients: { id: string; full_name: string }[];
  doctors: { id: string; full_name: string }[];
};

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validate(formData: FormData) {
  const errors: FormState["errors"] = {};
  const patientId = formData.get("patient_id") as string | null;
  const doctorId = formData.get("doctor_id") as string | null;
  const startTime = formData.get("start_time") as string | null;
  const endTime = formData.get("end_time") as string | null;
  const reason = formData.get("reason") as string | null;

  if (!patientId) errors.patient_id = ["Please select a patient."];
  if (!doctorId) errors.doctor_id = ["Please select a doctor."];
  if (!startTime) errors.start_time = ["Please select a start time."];
  if (!endTime) errors.end_time = ["Please select an end time."];
  if (startTime && new Date(startTime) < new Date()) {
    errors.start_time = ["Appointments cannot be booked in the past."];
  }
  if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
    errors.end_time = ["End time must be after start time."];
  }
  if (!reason?.trim()) errors.reason = ["Please add a brief reason for the visit."];

  return errors;
}

const minimumDateTime = toDateTimeLocalValue(new Date());

export default function AppointmentForm({
  initialPatientId,
  patients,
  doctors,
}: AppointmentFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_, formData) => {
      const errors = validate(formData);
      if (Object.keys(errors).length > 0) return { message: null, errors };

      const patientId = formData.get("patient_id") as string;
      const doctorId = formData.get("doctor_id") as string;
      const startTime = formData.get("start_time") as string;
      const endTime = formData.get("end_time") as string;
      const reason = formData.get("reason") as string;

      try {
        const response = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: doctorId,
            start_time: startTime,
            end_time: endTime,
            reason,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          // 409 = the slot clashes with another appointment; show it next to the time fields.
          if (response.status === 409) {
            return { message: null, errors: { start_time: [data.error ?? "That time is not available."] } };
          }
          return { message: data.error ?? "Failed to book appointment.", errors: {} };
        }

        router.push("/dashboard/appointments");
        router.refresh();
        return { message: null, errors: {} };
      } catch {
        return { message: "Could not reach the booking service. Please try again.", errors: {} };
      }
    },
    { message: null, errors: {} }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="patient_id" className="mb-2 block text-sm font-medium">
              Patient
            </label>
            <select
              id="patient_id"
              name="patient_id"
              defaultValue={initialPatientId}
              className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
              required
            >
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            {state.errors.patient_id?.map((error) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>

          <div className="grid gap-2">
            <label htmlFor="doctor_id" className="mb-2 block text-sm font-medium">
              Doctor
            </label>
            <select
              id="doctor_id"
              name="doctor_id"
              className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
            {state.errors.doctor_id?.map((error) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="start_time" className="mb-2 block text-sm font-medium">
                Start time
              </label>
              <input
                id="start_time"
                name="start_time"
                type="datetime-local"
                min={minimumDateTime}
                className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
                required
              />
              {state.errors.start_time?.map((error) => (
                <p key={error} className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              ))}
            </div>
            <div>
              <label htmlFor="end_time" className="mb-2 block text-sm font-medium">
                End time
              </label>
              <input
                id="end_time"
                name="end_time"
                type="datetime-local"
                min={minimumDateTime}
                className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
                required
              />
              {state.errors.end_time?.map((error) => (
                <p key={error} className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="reason" className="mb-2 block text-sm font-medium">
              Reason
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm"
              placeholder="Brief reason for the visit..."
              required
            />
            {state.errors.reason?.map((error) => (
              <p key={error} className="mt-2 text-sm text-red-500">
                {error}
              </p>
            ))}
          </div>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {state.message && <p className="mt-2 text-sm text-red-500">{state.message}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button type="button" onClick={() => router.back()} className="bg-gray-200 text-gray-700 hover:bg-gray-300" disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Booking..." : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}