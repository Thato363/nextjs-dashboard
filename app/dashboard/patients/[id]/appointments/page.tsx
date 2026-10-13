import { fetchAppointments, fetchPatientById } from "@/app/lib/data";
import AppointmentsList from "@/app/ui/patients/appointments-list";
import { lusitana } from "@/app/ui/fonts";
import { ViewAppointmentCalendar, ViewMedicalRecords } from "@/app/ui/patients/buttons";

export default async function PatientAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await fetchPatientById(id);
  const appointments = await fetchAppointments();

  const patientAppointments =
    patient && appointments
      ? appointments.filter((a) => a.patient_id === id)
      : [];

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`${lusitana.className} text-2xl`}>Appointments</h1>
          {patient && <p className="mt-1 text-sm text-gray-500">{patient.full_name}</p>}
        </div>
        <ViewMedicalRecords id={id} />
      </div>

      <AppointmentsList
        appointments={patientAppointments}
        patientName={patient?.full_name ?? ""}
      />
    </div>
  );
}
