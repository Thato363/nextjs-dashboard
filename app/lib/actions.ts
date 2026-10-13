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

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
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
    const userId = await getSupabaseUserIdByEmail(email);
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
    const userId = await getSupabaseUserIdByEmail(email);
    if (!userId) {
      return { message: 'No Supabase account matches your login email.' };
    }

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
      .eq('user_id', userId)
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

  const userId = await getSupabaseUserIdByEmail(email);
  if (!userId) {
    throw new Error('No Supabase account matches your login email.');
  }

  const { data, error } = await createClient()
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
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