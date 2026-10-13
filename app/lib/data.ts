import postgres from "postgres";
import {
  CustomerField,
  CustomersTableType,
  FormattedCustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { customers, invoices, revenue as fallbackRevenue, users } from "./placeholder-data";
import { formatCurrency } from "./utils";
import { auth } from "@/auth";
import {
  createClient,
  getSupabaseUserIdByEmail,
} from "@/lib/supabase/server";

const sql = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: "require" })
  : null;

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = String((error as { message?: string }).message ?? "");
  const code = (error as { code?: string }).code;
  const errno = (error as { errno?: number }).errno;

  return (
    code === "ECONNREFUSED" ||
    errno === -4078 ||
    message.toLowerCase().includes("econnrefused") ||
    message.toLowerCase().includes("connection refused") ||
    message.toLowerCase().includes("could not connect")
  );
}

function isMissingSupabaseTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = String((error as { message?: string }).message ?? "");
  const code = (error as { code?: string }).code;

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.toLowerCase().includes("could not find the table") ||
    message.toLowerCase().includes("table") && message.toLowerCase().includes("does not exist") ||
    message.toLowerCase().includes("relation") && message.toLowerCase().includes("does not exist")
  );
}

function isMissingPatientGenderColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message = String((error as { message?: string }).message ?? "").toLowerCase();
  return (error as { code?: string }).code === "42703" && message.includes("gender");
}

async function withDatabaseFallback<T>(fallback: T, callback: () => Promise<T>): Promise<T> {
  if (!sql) {
    return fallback;
  }

  try {
    return await callback();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn("Database unavailable; using placeholder data instead.");
      return fallback;
    }

    throw error;
  }
}

export async function fetchRevenue(): Promise<Revenue[]> {
  return withDatabaseFallback(fallbackRevenue as Revenue[], async () => {
    console.log("Fetching revenue data...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const db = sql!;
    const data = await db<Revenue[]>`SELECT * FROM revenue`;

    console.log("Data fetch completed after 3 seconds.");
    return data;
  });
}

export async function fetchLatestInvoices(): Promise<LatestInvoice[]> {
  return withDatabaseFallback(
    invoices.slice(0, 5).map((invoice) => ({
      id: invoice.id,
      name:
        customers.find((customer) => customer.id === invoice.customer_id)?.name ?? "Unknown customer",
      image_url:
        customers.find((customer) => customer.id === invoice.customer_id)?.image_url ??
        "/customers/default.png",
      email:
        customers.find((customer) => customer.id === invoice.customer_id)?.email ??
        "unknown@example.com",
      amount: formatCurrency(invoice.amount),
    })),
    async () => {
      const db = sql!;
      const data = await db<LatestInvoiceRaw[]>`
        SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        ORDER BY invoices.date DESC
        LIMIT 5`;

      return data.map((invoice) => ({
        ...invoice,
        amount: formatCurrency(invoice.amount),
      }));
    },
  );
}

export async function fetchCardData(): Promise<{
  numberOfCustomers: number;
  numberOfInvoices: number;
  totalPaidInvoices: string;
  totalPendingInvoices: string;
}> {
  return withDatabaseFallback(
    {
      numberOfCustomers: customers.length,
      numberOfInvoices: invoices.length,
      totalPaidInvoices: formatCurrency(
        invoices
          .filter((invoice) => invoice.status === "paid")
          .reduce((sum, invoice) => sum + invoice.amount, 0),
      ),
      totalPendingInvoices: formatCurrency(
        invoices
          .filter((invoice) => invoice.status === "pending")
          .reduce((sum, invoice) => sum + invoice.amount, 0),
      ),
    },
    async () => {
      const db = sql!;
      const invoiceCountPromise = db`SELECT COUNT(*) FROM invoices`;
      const customerCountPromise = db`SELECT COUNT(*) FROM customers`;
      const invoiceStatusPromise = db`SELECT
           SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
           SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
           FROM invoices`;

      const data = await Promise.all([
        invoiceCountPromise,
        customerCountPromise,
        invoiceStatusPromise,
      ]);

      const numberOfInvoices = Number(data[0][0].count ?? "0");
      const numberOfCustomers = Number(data[1][0].count ?? "0");
      const totalPaidInvoices = formatCurrency(data[2][0].paid ?? "0");
      const totalPendingInvoices = formatCurrency(data[2][0].pending ?? "0");

      return {
        numberOfCustomers,
        numberOfInvoices,
        totalPaidInvoices,
        totalPendingInvoices,
      };
    },
  );
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
): Promise<InvoicesTable[]> {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const filteredInvoices = invoices.filter((invoice) => {
    const customer = customers.find((candidate) => candidate.id === invoice.customer_id);
    const matches =
      customer?.name.toLowerCase().includes(query.toLowerCase()) ||
      customer?.email.toLowerCase().includes(query.toLowerCase()) ||
      invoice.amount.toString().includes(query) ||
      invoice.date.includes(query) ||
      invoice.status.toLowerCase().includes(query.toLowerCase());

    return matches;
  });

  return withDatabaseFallback(
    filteredInvoices.slice(offset, offset + ITEMS_PER_PAGE).map((invoice) => ({
      id: invoice.id,
      customer_id: invoice.customer_id,
      name:
        customers.find((customer) => customer.id === invoice.customer_id)?.name ?? "Unknown customer",
      email:
        customers.find((customer) => customer.id === invoice.customer_id)?.email ??
        "unknown@example.com",
      image_url:
        customers.find((customer) => customer.id === invoice.customer_id)?.image_url ??
        "/customers/default.png",
      date: invoice.date,
      amount: invoice.amount,
      status: invoice.status as "pending" | "paid",
    })),
    async () => {
      const db = sql!;
      const data = await db<InvoicesTable[]>`
        SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          customers.name ILIKE ${`%${query}%`} OR
          customers.email ILIKE ${`%${query}%`} OR
          invoices.amount::text ILIKE ${`%${query}%`} OR
          invoices.date::text ILIKE ${`%${query}%`} OR
          invoices.status ILIKE ${`%${query}%`}
        ORDER BY invoices.date DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
      `;

      return data;
    },
  );
}

export async function fetchInvoicesPages(query: string): Promise<number> {
  const filteredInvoices = invoices.filter((invoice) => {
    const customer = customers.find((candidate) => candidate.id === invoice.customer_id);
    return (
      customer?.name.toLowerCase().includes(query.toLowerCase()) ||
      customer?.email.toLowerCase().includes(query.toLowerCase()) ||
      invoice.amount.toString().includes(query) ||
      invoice.date.includes(query) ||
      invoice.status.toLowerCase().includes(query.toLowerCase())
    );
  });

  return withDatabaseFallback(
    Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)),
    async () => {
      const db = sql!;
      const data = await db`SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
    `;

      return Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    },
  );
}

export async function fetchInvoiceById(id: string): Promise<InvoiceForm | null> {
  const fallbackInvoice = invoices.find((invoice) => invoice.id === id);

  return withDatabaseFallback(
    fallbackInvoice
      ? {
          id: fallbackInvoice.id,
          customer_id: fallbackInvoice.customer_id,
          amount: fallbackInvoice.amount,
          status: fallbackInvoice.status as "pending" | "paid",
        }
      : null,
    async () => {
      const db = sql!;
      const data = await db<InvoiceForm[]>`
        SELECT
          invoices.id,
          invoices.customer_id,
          invoices.amount,
          invoices.status
        FROM invoices
        WHERE invoices.id = ${id};
      `;

      const invoice = data.map((invoice) => ({
        ...invoice,
        amount: invoice.amount / 100,
      }));
      console.log(invoice);

      return invoice[0] ?? null;
    },
  );
}

export async function fetchCustomers(): Promise<CustomerField[]> {
  return withDatabaseFallback(
    customers.map((customer) => ({ id: customer.id, name: customer.name })) as CustomerField[],
    async () => {
      const db = sql!;
      const data = await db<CustomerField[]>`
        SELECT
          id,
          name
        FROM customers
        ORDER BY name ASC
      `;

      return data;
    },
  );
}

export async function fetchFilteredCustomers(query: string): Promise<FormattedCustomersTable[]> {
  const filtered = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.email.toLowerCase().includes(query.toLowerCase())
    );
  });

  return withDatabaseFallback(
    filtered.map((customer) => {
      const customerInvoices = invoices.filter((invoice) => invoice.customer_id === customer.id);
      const total_pending = customerInvoices
        .filter((invoice) => invoice.status === "pending")
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const total_paid = customerInvoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
        total_invoices: customerInvoices.length,
        total_pending: formatCurrency(total_pending),
        total_paid: formatCurrency(total_paid),
      } satisfies FormattedCustomersTable;
    }),
    async () => {
      const db = sql!;
      const data = await db<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

      return data.map((customer) => ({
        ...customer,
        total_pending: formatCurrency(customer.total_pending),
        total_paid: formatCurrency(customer.total_paid),
      }));
    },
  );
}

//New code

export type Patient = {
  id: string;
  user_id: string;
  portal_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  created_at: string;
};

export async function fetchPatients(): Promise<Patient[]> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view patients.");
  }

  try {
    const userId = await getSupabaseUserIdByEmail(email);
    if (!userId) {
      return [];
    }

    const client = createClient();
    const isPatient = (session.user as { role?: string }).role === "patient";
    const scopeColumn = isPatient ? "portal_user_id" : "user_id";
    const { data, error } = await client
      .from("patients")
      .select("id, user_id, portal_user_id, full_name, email, phone, date_of_birth, gender, created_at")
      .eq(scopeColumn, userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingPatientGenderColumnError(error)) {
        console.warn("Patient gender migration is not applied; loading patient profiles without gender.");
        const legacyResult = await client
          .from("patients")
          .select("id, user_id, portal_user_id, full_name, email, phone, date_of_birth, created_at")
          .eq(scopeColumn, userId)
          .order("created_at", { ascending: false });
        if (legacyResult.error) throw legacyResult.error;
        return ((legacyResult.data ?? []).map((patient: Omit<Patient, "gender">) => ({ ...patient, gender: null }))) as Patient[];
      }
      if (isMissingSupabaseTableError(error)) {
        console.warn("Patient table is not available; returning an empty list.");
        return [];
      }
      throw error;
    }

    return (data ?? []) as Patient[];
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Patient table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch patients:", error);
    throw new Error("Failed to fetch patients.");
  }
}

export async function fetchPatientById(id: string): Promise<Patient | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view patients.");
  }

  try {
    const userId = await getSupabaseUserIdByEmail(email);
    if (!userId) {
      return null;
    }

    const client = createClient();
    const isPatient = (session.user as { role?: string }).role === "patient";
    const scopeColumn = isPatient ? "portal_user_id" : "user_id";
    const { data, error } = await client
      .from("patients")
      .select("id, user_id, portal_user_id, full_name, email, phone, date_of_birth, gender, created_at")
      .eq("id", id)
      .eq(scopeColumn, userId)
      .maybeSingle();

    if (error) {
      if (isMissingPatientGenderColumnError(error)) {
        console.warn("Patient gender migration is not applied; loading patient profile without gender.");
        const legacyResult = await client
          .from("patients")
          .select("id, user_id, portal_user_id, full_name, email, phone, date_of_birth, created_at")
          .eq("id", id)
          .eq(scopeColumn, userId)
          .maybeSingle();
        if (legacyResult.error) throw legacyResult.error;
        return legacyResult.data ? ({ ...legacyResult.data, gender: null } as Patient) : null;
      }
      if (isMissingSupabaseTableError(error)) {
        console.warn("Patient table is not available; returning null.");
        return null;
      }
      throw error;
    }

    return (data as Patient | null) ?? null;
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Patient table is not available; returning null.");
      return null;
    }

    console.error("Failed to fetch patient:", error);
    throw new Error("Failed to fetch patient.");
  }
}

// ---- Medical / Appointment Types --------------------------------------------------

export type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
  created_at: string;
};

export type AppointmentsWithDate = Appointment;

export type MedicalRecord = {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  record_type: "diagnosis" | "prescription" | "lab_result" | "visit_notes";
  title: string;
  summary: string;
  created_at: string;
};

export type MedicalInvoice = {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  service_description: string;
  amount: number;
  payment_method: "medical_aid" | "cash" | "card" | "bank_transfer" | "other";
  payment_status: "paid" | "pending" | "denied";
  medical_aid_provider: string | null;
  reference_number: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
};

// ---- Live / Real-Time Data Helpers ---------------------------------------------------

const LIVE_INTERVAL_MS = 10_000;

function normalizeDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = value.startsWith("T") ? `1970-01-01${value}` : value;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}


export async function fetchTodayAppointments() {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view appointments.");
  }

  try {
    const ownedPatients = await fetchPatients();
    const ownedPatientIds = ownedPatients.map((p) => p.id);
    if (ownedPatientIds.length === 0) {
      return [];
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const { data, error } = await createClient()
      .from("med_appointments")
      .select(
        `id, patient_id, doctor_id, doctor_name, patient_name, start_time, end_time, status, reason, created_at`
      )
      .in("patient_id", ownedPatientIds)
      .gte("start_time", start.toISOString())
      .lte("end_time", end.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Appointments table is not available; returning an empty list.");
        return [];
      }
      console.error("Failed to fetch today's appointments:", error);
      throw new Error("Failed to fetch today's appointments.");
    }

    return ((data ?? []) as unknown) as AppointmentsWithDate[];
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Appointments table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch today's appointments:", error);
    throw new Error("Failed to fetch today's appointments.");
  }
}


export async function fetchAppointmentsByDate(date: string) {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view appointments.");
  }

  try {
    const ownedPatients = await fetchPatients();
    const ownedPatientIds = ownedPatients.map((p) => p.id);
    if (ownedPatientIds.length === 0) {
      return [];
    }

    const { data, error } = await createClient()
      .from("med_appointments")
      .select(
        `id, patient_id, doctor_id, doctor_name, patient_name, start_time, end_time, status, reason, created_at`
      )
      .in("patient_id", ownedPatientIds)
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59.999Z`)
      .order("start_time", { ascending: true });

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Appointments table is not available; returning an empty list.");
        return [];
      }
      console.error("Failed to fetch appointments:", error);
      throw new Error("Failed to fetch appointments.");
    }

    return ((data ?? []) as unknown) as Appointment[];
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Appointments table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch appointments:", error);
    throw new Error("Failed to fetch appointments.");
  }
}


export async function fetchAppointments() {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view appointments.");
  }

  try {
    const ownedPatients = await fetchPatients();
    const ownedPatientIds = ownedPatients.map((p) => p.id);
    if (ownedPatientIds.length === 0) {
      return [];
    }

    const { data, error } = await createClient()
      .from("med_appointments")
      .select(
        `id, patient_id, doctor_id, doctor_name, patient_name, start_time, end_time, status, reason, created_at`
      )
      .in("patient_id", ownedPatientIds)
      .order("start_time", { ascending: true });

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Appointments table is not available; returning an empty list.");
        return [];
      }
      console.error("Failed to fetch appointments:", error);
      throw new Error("Failed to fetch appointments.");
    }

    const appointments = ((data ?? []) as unknown) as Appointment[];
    return appointments.map((a) => ({
      ...a,
      start_time: normalizeDateTime(a.start_time)?.toISOString() ?? a.start_time,
      end_time: normalizeDateTime(a.end_time)?.toISOString() ?? a.end_time,
    }));
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Appointments table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch appointments:", error);
    throw new Error("Failed to fetch appointments.");
  }
}


export async function fetchLiveAppointments() {
  const appointments = await fetchAppointments();
  const live = [...appointments];

  const interval = setInterval(() => {
    fetchAppointments()
      .then((next) => {
        const nextMap = new Map(next.map((a) => [a.id, a]));
        const updated = live.map((a) => nextMap.get(a.id) ?? a);
        live.length = 0;
        live.push(...updated);
      })
      .catch(() => {});
  }, LIVE_INTERVAL_MS);

  return { live, stop: () => clearInterval(interval) };
}


export async function fetchLiveAppointmentsStream() {
  const appointments = await fetchAppointments();
  const live = [...appointments];
  let stop: (() => void) | undefined;

  const interval = setInterval(() => {
    fetchAppointments()
      .then((next) => {
        const nextMap = new Map(next.map((a) => [a.id, a]));
        const updated = live.map((a) => nextMap.get(a.id) ?? a);
        live.length = 0;
        live.push(...updated);
      })
      .catch(() => {});
  }, LIVE_INTERVAL_MS);

  return {
    live,
    stop: () => {
      clearInterval(interval);
      stop?.();
    },
  };
}


export async function fetchMedicalRecords() {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view medical records.");
  }

  try {
    const ownedPatients = await fetchPatients();
    const ownedPatientIds = ownedPatients.map((p) => p.id);
    if (ownedPatientIds.length === 0) {
      return [];
    }

    const { data, error } = await createClient()
      .from("med_records")
      .select(
        `id, patient_id, doctor_id, doctor_name, patient_name, record_type, title, summary, created_at`
      )
      .in("patient_id", ownedPatientIds)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Medical records table is not available; returning an empty list.");
        return [];
      }
      console.error("Failed to fetch medical records:", error);
      throw new Error("Failed to fetch medical records.");
    }

    return ((data ?? []) as unknown) as MedicalRecord[];
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Medical records table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch medical records:", error);
    throw new Error("Failed to fetch medical records.");
  }
}

export async function fetchMedicalInvoices(): Promise<MedicalInvoice[]> {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view billing records.");
  }

  try {
    const ownedPatients = await fetchPatients();
    const ownedPatientIds = ownedPatients.map((patient) => patient.id);
    if (ownedPatientIds.length === 0) return [];

    const { data, error } = await createClient()
      .from("med_invoices")
      .select("id, patient_id, patient_name, doctor_name, service_description, amount, payment_method, payment_status, medical_aid_provider, reference_number, issued_at, paid_at, created_at")
      .in("patient_id", ownedPatientIds)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Medical billing table is not available; returning an empty list.");
        return [];
      }
      throw error;
    }

    return (data ?? []) as MedicalInvoice[];
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Medical billing table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch medical billing records:", error);
    throw new Error("Failed to fetch medical billing records.");
  }
}


export async function fetchLiveMedicalRecords() {
  const records = await fetchMedicalRecords();
  const live = [...records];

  const interval = setInterval(() => {
    fetchMedicalRecords()
      .then((next) => {
        const nextMap = new Map(next.map((r) => [r.id, r]));
        const updated = live.map((r) => nextMap.get(r.id) ?? r);
        live.length = 0;
        live.push(...updated);
      })
      .catch(() => {});
  }, LIVE_INTERVAL_MS);

  return { live, stop: () => clearInterval(interval) };
}

export async function fetchUsers() {
  const email = (await auth())?.user?.email;
  if (!email) {
    throw new Error("You must be signed in to view doctors.");
  }

  try {
    const userId = await getSupabaseUserIdByEmail(email);
    if (!userId) {
      return [];
    }

    const { data, error } = await createClient()
      .from("users")
      .select("id, name, email, role");

    if (error) {
      if (isMissingSupabaseTableError(error)) {
        console.warn("Users table is not available; returning an empty list.");
        return [];
      }
      console.error("Failed to fetch doctors:", error);
      throw new Error("Failed to fetch doctors.");
    }

    return (((data ?? []) as unknown) as { id: string; name: string; email: string; role: string }[])
      .filter((u) => u.role === "doctor" || u.role === "admin")
      .map((u) => ({
      id: u.id,
      full_name: u.name,
      }));
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      console.warn("Users table is not available; returning an empty list.");
      return [];
    }

    console.error("Failed to fetch doctors:", error);
    throw new Error("Failed to fetch doctors.");
  }
}


export async function fetchDoctors() {
  return fetchUsers();
}

