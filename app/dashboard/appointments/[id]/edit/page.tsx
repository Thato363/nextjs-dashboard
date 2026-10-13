import { fetchAppointments, fetchPatientById, fetchPatients, fetchDoctors } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";

export default async function AppointmentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appointments = await fetchAppointments();
  const appointment = appointments.find((a) => a.id === id);

  const patients = await fetchPatients();
  const doctors = await fetchDoctors();

  if (!appointment) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Appointment not found.</p>
      </div>
    );
  }

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Edit Appointment</h1>
      </div>

      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="mb-2 block text-sm font-medium">Patient</label>
            <p className="text-sm text-gray-700">{appointment.patient_name}</p>
          </div>
          <div className="grid gap-2">
            <label className="mb-2 block text-sm font-medium">Doctor</label>
            <p className="text-sm text-gray-700">{appointment.doctor_name}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Start time</label>
              <p className="text-sm text-gray-700">
                {appointment.start_time}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">End time</label>
              <p className="text-sm text-gray-700">
                {appointment.end_time}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="mb-2 block text-sm font-medium">Reason</label>
            <p className="text-sm text-gray-700">{appointment.reason}</p>
          </div>
          <div className="grid gap-2">
            <label className="mb-2 block text-sm font-medium">Status</label>
            <p
              className={`text-sm font-medium ${
                appointment.status === "scheduled"
                  ? "text-blue-600"
                  : appointment.status === "completed"
                    ? "text-emerald-600"
                    : "text-gray-600"
              }`}
            >
              {appointment.status}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
