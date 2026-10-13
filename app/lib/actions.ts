"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import {
  createClient,
  getSupabaseUserIdByEmail,
} from "@/lib/supabase/server";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
  id: z.string(),
  customerId: z
    .string({
      required_error: "Please select a customer.",
      invalid_type_error: "Please select a customer.",
    })
    .min(1, { message: "Please select a customer." }),
  amount: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce
      .number({
        required_error: "Please enter an amount.",
        invalid_type_error: "Please enter an amount.",
      })
      .gt(0, { message: "Please enter an amount greater than $0." }),
  ),
  status: z.enum(["pending", "paid"], {
    required_error: "Please select an invoice status.",
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true });

async function requireClinicAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "admin" && role !== "doctor")) {
    throw new Error("Only clinic admins can manage clinic billing.");
  }
}

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  await requireClinicAdmin();
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error(error);
    throw new Error("Database Error: Failed to Create Invoice.");
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  await requireClinicAdmin();
  const validatedFields = UpdateInvoice.safeParse({
    id,
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    // date: new Date().toISOString().split('T')[0],
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await requireClinicAdmin();
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    console.error(error);
    throw new Error("Database Error: Failed to Delete Invoice.");
  }

  revalidatePath("/dashboard/invoices");
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

//New Code

const PatientSchema = z.object({
  full_name: z.string().trim().min(1, { message: 'Please enter the patient\'s full name.' }),
  email: z.string().trim().email({ message: 'Enter the patient\'s Supabase sign-in email.' }),
  phone: z.string().trim().min(1, { message: 'Please enter the patient\'s phone number.' }),
  gender: z.enum(['female', 'male'], {
    required_error: 'Please select female or male.',
  }),
  date_of_birth: z.string().min(1, { message: 'Please enter the patient\'s date of birth.' }).refine(
    (value) => !Number.isNaN(Date.parse(value)),
    { message: 'Please enter a valid date of birth.' },
  ),
});

export type PatientState = {
  errors?: {
    full_name?: string[];
    email?: string[];
    phone?: string[];
    gender?: string[];
    date_of_birth?: string[];
  };
  message?: string | null;
};

function isClinicStaff(role: string | undefined): boolean {
  return role === "doctor" || role === "admin";
}

export async function createPatient(prevState: PatientState, formData: FormData) {
  const validated = PatientSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    gender: formData.get('gender'),
    date_of_birth: formData.get('date_of_birth'),
  });
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create patient.',
    };
  }
  const { full_name, email: patientEmail, phone, gender, date_of_birth } = validated.data;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { message: 'You must be signed in to create a patient.' };
  }
  if (!isClinicStaff((session.user as { role?: string }).role)) {
    return { message: 'Only clinic staff can create patient records.' };
  }

  try {
    const userId = (session.user as { id?: string }).id ?? await getSupabaseUserIdByEmail(email);
    if (!userId) {
      return { message: 'No Supabase account matches your login email.' };
    }

    const portalUserId = await getSupabaseUserIdByEmail(patientEmail);
    if (!portalUserId) {
      return { message: 'Create the patient account in Supabase Auth before linking this profile.' };
    }

    const { error } = await createClient().from('patients').insert({
      user_id: userId,
      portal_user_id: portalUserId,
      full_name,
      email: patientEmail.toLowerCase(),
      phone: phone || null,
      gender,
      date_of_birth: date_of_birth || null,
    });
    if (error) {
      console.error('Failed to create patient:', error);
      return { message: 'Database error: failed to create patient.' };
    }
  } catch (error) {
    console.error('Failed to create patient:', error);
    return { message: 'Database error: failed to create patient.' };
  }

  revalidatePath('/dashboard/patients');
  revalidatePath('/dashboard');
  redirect('/dashboard/patients');
}

export async function updatePatient(
  id: string,
  prevState: PatientState,
  formData: FormData,
) {
  const validated = PatientSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    gender: formData.get('gender'),
    date_of_birth: formData.get('date_of_birth'),
  });
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to update patient.',
    };
  }
  const { full_name, email: patientEmail, phone, gender, date_of_birth } = validated.data;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { message: 'You must be signed in to update a patient.' };
  }
  if (!isClinicStaff((session.user as { role?: string }).role)) {
    return { message: 'Only clinic staff can update patient records.' };
  }

  try {
    const portalUserId = await getSupabaseUserIdByEmail(patientEmail);
    if (!portalUserId) {
      return { message: 'Create the patient account in Supabase Auth before linking this profile.' };
    }

    const { data, error } = await createClient()
      .from('patients')
      .update({
        portal_user_id: portalUserId,
        full_name,
        email: patientEmail.toLowerCase(),
        phone: phone || null,
        gender,
        date_of_birth: date_of_birth || null,
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('Failed to update patient:', error);
      return { message: 'Database error: failed to update patient.' };
    }
    if (!data) {
      return { message: 'Patient not found.' };
    }
  } catch (error) {
    console.error('Failed to update patient:', error);
    return { message: 'Database error: failed to update patient.' };
  }

  revalidatePath('/dashboard/patients');
  revalidatePath('/dashboard');
  redirect('/dashboard/patients');
}

export async function deletePatient(id: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new Error('You must be signed in to delete a patient.');
  }
  if (!isClinicStaff((session.user as { role?: string }).role)) {
    throw new Error('Only clinic staff can delete patient records.');
  }

  const { data, error } = await createClient()
    .from('patients')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Failed to delete patient:', error);
    throw new Error('Database error: failed to delete patient.');
  }
  if (!data) {
    throw new Error('Patient not found.');
  }

  revalidatePath('/dashboard/patients');
}

const DoctorProfileSchema = z.object({
  email: z.string().trim().email({ message: "Enter the clinician's Supabase login email." }),
  full_name: z.string().trim().min(2, { message: "Enter the clinician's full name." }),
  specialty: z.string().trim().max(120).optional(),
  practice_number: z.string().trim().max(80).optional(),
});

export type DoctorProfileState = {
  message?: string;
  success?: boolean;
};

export async function addDoctorProfile(
  _previousState: DoctorProfileState | undefined,
  formData: FormData,
): Promise<DoctorProfileState> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "admin" && role !== "doctor")) {
    return { message: "Only clinic admins can add clinician profiles." };
  }

  const validated = DoctorProfileSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    specialty: formData.get("specialty") || undefined,
    practice_number: formData.get("practice_number") || undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Check the clinician details and try again." };
  }

  const { email, full_name, specialty, practice_number } = validated.data;
  let invitationSent = false;
  try {
    const client = createClient();
    const { data: patientEmail, error: patientEmailError } = await client
      .from("patients")
      .select("id")
      .ilike("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (patientEmailError) throw patientEmailError;
    if (patientEmail) {
      return { message: "Use a separate login email for clinicians. This email belongs to a patient profile." };
    }

    let userId = await getSupabaseUserIdByEmail(email.toLowerCase());
    if (!userId) {
      const { data: invitation, error: invitationError } = await client.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        { data: { full_name } },
      );
      if (invitationError || !invitation.user) {
        console.error("Failed to invite clinician to Supabase Auth:", invitationError);
        return { message: "Could not send the clinician invitation. Check Supabase Auth email delivery and try again." };
      }
      userId = invitation.user.id;
      invitationSent = true;
    }

    const { data: patientAccount, error: patientError } = await client
      .from("patients")
      .select("id")
      .eq("portal_user_id", userId)
      .limit(1)
      .maybeSingle();
    if (patientError) throw patientError;
    if (patientAccount) {
      return { message: "Use a separate login for clinic staff. This account is linked to a patient record." };
    }

    const { data: existingProfile, error: profileError } = await client
      .from("doctor_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (existingProfile) {
      return { message: "This Auth account already has a clinician profile." };
    }

    const { error: insertError } = await client.from("doctor_profiles").insert({
      user_id: userId,
      full_name,
      specialty: specialty?.trim() || null,
      practice_number: practice_number?.trim() || null,
      role: "admin",
      is_active: true,
    });
    if (insertError) throw insertError;
  } catch (error) {
    console.error("Failed to add clinician profile:", error);
    return { message: "Could not add the clinician profile. Check the Auth account and try again." };
  }

  revalidatePath("/dashboard/clinicians");
  revalidatePath("/dashboard/appointments/new");
  revalidatePath("/dashboard");
  return {
    message: invitationSent
      ? `An invitation was sent to ${email}. Admin access activates when the clinician accepts and sets their own password.`
      : `${full_name} now has an active clinician profile with clinic admin access.`,
    success: true,
  };
}

