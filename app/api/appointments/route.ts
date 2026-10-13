import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createClient, getSupabaseUserIdByEmail } from "@/lib/supabase/server";
import { fetchAppointments } from "@/app/lib/data";

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
    const userId = await getSupabaseUserIdByEmail(email);

    if (!userId) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const role = (session.user as { role?: string }).role;
    const patientScope = role === "patient" ? "portal_user_id" : "user_id";
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("id", patient_id)
      .eq(patientScope, userId)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found or access denied." },
        { status: 404 }
      );
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("id", doctor_id)
      .in("role", ["doctor", "admin"])
      .maybeSingle();

    if (doctorError) throw doctorError;
    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found." },
        { status: 404 }
      );
    }

    const { data: existing, error: conflictError } = await supabase
      .from("med_appointments")
      .select("id")
      .eq("doctor_id", doctor_id)
      .eq("status", "scheduled")
      .lt("start_time", parsedEndTime.toISOString())
      .gt("end_time", parsedStartTime.toISOString())
      .limit(1);

    if (conflictError) throw conflictError;
    if (existing?.length) {
      return NextResponse.json(
        { error: "This doctor already has a scheduled appointment at that time." },
        { status: 409 }
      );
    }

    const { data: appointment, error: insertError } = await supabase
      .from("med_appointments")
      .insert({
        patient_id,
        doctor_id,
        patient_name: patient.full_name,
        doctor_name: doctor.name,
        start_time: parsedStartTime.toISOString(),
        end_time: parsedEndTime.toISOString(),
        reason: reason.trim(),
        status: "scheduled",
      })
      .select("id, patient_id, doctor_id, patient_name, doctor_name, start_time, end_time, reason, status, created_at")
      .single();

    if (insertError) throw insertError;

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
