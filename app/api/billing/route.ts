import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { createClient, getSupabaseUserIdByEmail } from "@/lib/supabase/server";

const BillingSchema = z.object({
  patient_id: z.string().uuid(),
  service_description: z.string().trim().min(2).max(240),
  amount: z.number().finite().positive().max(1_000_000),
  payment_method: z.enum(["medical_aid", "cash", "card", "bank_transfer", "other"]),
  payment_status: z.enum(["paid", "pending", "denied"]),
  medical_aid_provider: z.string().trim().max(120).optional().default(""),
  reference_number: z.string().trim().max(120).optional().default(""),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Sign in before recording a payment." }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only clinic staff can create billing records." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The billing details are invalid." }, { status: 400 });
  }

  const parsed = BillingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the patient, service, amount, and payment details." }, { status: 400 });
  }

  const values = parsed.data;
  if (values.payment_method === "medical_aid" && !values.medical_aid_provider) {
    return NextResponse.json({ error: "Enter the medical aid provider for this payment." }, { status: 400 });
  }

  try {
    const ownerUserId = await getSupabaseUserIdByEmail(email);
    if (!ownerUserId) {
      return NextResponse.json({ error: "Your login is not linked to a clinic account." }, { status: 403 });
    }

    const supabase = createClient();
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("id", values.patient_id)
      .eq("user_id", ownerUserId)
      .maybeSingle();

    if (patientError) throw patientError;
    if (!patient) {
      return NextResponse.json({ error: "Patient not found or access denied." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { data: invoice, error } = await supabase
      .from("med_invoices")
      .insert({
        owner_user_id: ownerUserId,
        patient_id: patient.id,
        patient_name: patient.full_name,
        doctor_name: session.user?.name || email,
        service_description: values.service_description,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_status: values.payment_status,
        medical_aid_provider: values.payment_method === "medical_aid" ? values.medical_aid_provider : null,
        reference_number: values.reference_number || null,
        issued_at: now,
        paid_at: values.payment_status === "paid" ? now : null,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    return NextResponse.json({ message: "Billing record saved.", id: invoice.id }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "PGRST205" || code === "42P01") {
      return NextResponse.json({ error: "Billing storage is not ready in Supabase yet." }, { status: 503 });
    }

    console.error("Failed to save billing record:", error);
    return NextResponse.json({ error: "Could not save this billing record." }, { status: 500 });
  }
}
