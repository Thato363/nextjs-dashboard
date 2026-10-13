import AppointmentForm from "@/app/ui/patients/appointment-form";
import { fetchPatients, fetchUsers } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const query = await searchParams;
  const patients = await fetchPatients();
  const doctors = await fetchUsers();

  const initialPatientId = query.patientId ?? "";

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Book an Appointment</h1>
      </div>

      <AppointmentForm
        initialPatientId={initialPatientId}
        patients={patients}
        doctors={doctors}
      />
    </main>
  );
}
