import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createClient, getSupabaseUserIdByEmail } from "@/lib/supabase/server";
import { fetchAppointments } from "@/app/lib/data";

// Appointments in these states occupy their time slot. Completed, cancelled and no-show ones free it.
const ACTIVE_APPOINTMENT_STATUSES = ["scheduled", "checked_in"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ appointments: [] }, { status: 401 });
    }

    const appointments = await fetchAppointments();
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Failed to load appointments:", error);
    return NextResponse.json({ appointments: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to book an appointment." },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string }).role ?? "patient";
    if (role !== "patient" && role !== "doctor" && role !== "admin") {
      return NextResponse.json({ error: "You do not have access to book appointments." }, { status: 403 });
    }

    const body = await request.json();
    const { patient_id, doctor_id, start_time, end_time, reason } = body;

    if (!patient_id || !doctor_id || !start_time || !end_time || !reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: patient_id, doctor_id, start_time, end_time, reason." },
        { status: 400 }
      );
    }

    const parsedStartTime = new Date(start_time);
    const parsedEndTime = new Date(end_time);
    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid start_time or end_time format." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (parsedStartTime < now) {
      return NextResponse.json(
        { error: "Appointments cannot be booked in the past." },
        { status: 400 }
      );
    }

    if (parsedEndTime <= parsedStartTime) {
      return NextResponse.json(
        { error: "End time must be after the selected start time." },
        { status: 400 }
      );
    }

    const email = session.user.email;
    const userId = (session.user as { id?: string }).id ?? await getSupabaseUserIdByEmail(email);

    if (!userId) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const patientQuery = supabase
      .from("patients")
      .select("id, full_name")
      .eq("id", patient_id)
    const scopedPatientQuery = role === "patient"
      ? patientQuery.or(`portal_user_id.eq.${userId},user_id.eq.${userId}`)
      : patientQuery;
    const { data: patient, error: patientError } = await scopedPatientQuery.maybeSingle();

    if (patientError) throw patientError;
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found or access denied." },
        { status: 404 }
      );
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("doctor_profiles")
      .select("user_id, full_name, role, is_active")
      .eq("user_id", doctor_id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (doctorError) throw doctorError;
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found." },
        { status: 404 }
      );
    }

    // Two appointments clash when their time ranges overlap (back-to-back is fine) and both are
    // still active. Check the doctor and the patient: neither can be in two places at once.
    const overlapsRequestedTime = (query: any) =>
      query
        .in("status", ACTIVE_APPOINTMENT_STATUSES)
        .lt("start_time", parsedEndTime.toISOString())
        .gt("end_time", parsedStartTime.toISOString())
        .limit(1);

    const [doctorClash, patientClash] = await Promise.all([
      overlapsRequestedTime(
        supabase.from("med_appointments").select("id").eq("doctor_id", doctor_id),
      ),
      overlapsRequestedTime(
        supabase.from("med_appointments").select("id").eq("patient_id", patient_id),
      ),
    ]);

    if (doctorClash.error) throw doctorClash.error;
    if (patientClash.error) throw patientClash.error;

    if (doctorClash.data?.length) {
      return NextResponse.json(
        { error: "That doctor is already booked at this time. Please choose a different time." },
        { status: 409 }
      );
    }
    if (patientClash.data?.length) {
      return NextResponse.json(
        { error: "This patient already has an appointment that overlaps this time." },
        { status: 409 }
      );
    }

    const { data: appointment, error: insertError } = await supabase
      .from("med_appointments")
      .insert({
        patient_id,
        doctor_id,
        patient_name: patient.full_name,
        doctor_name: doctor.full_name,
        start_time: parsedStartTime.toISOString(),
        end_time: parsedEndTime.toISOString(),
        reason: reason.trim(),
        status: "scheduled",
      })
      .select("id, patient_id, doctor_id, patient_name, doctor_name, start_time, end_time, reason, status, created_at")
      .single();

    if (insertError) {
      // 23P01 = exclusion_violation: the database's overlap constraint caught a booking that
      // slipped in between our check above and this insert (two people booking at once).
      if ((insertError as { code?: string }).code === "23P01") {
        return NextResponse.json(
          { error: "That time was just taken. Please choose a different time." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    revalidatePath(`/dashboard/patients/${patient_id}/appointments`);

    return NextResponse.json({
      message: "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Failed to book appointment:", error);
    return NextResponse.json(
      { error: "Failed to book appointment." },
      { status: 500 }
    );
  }
}

