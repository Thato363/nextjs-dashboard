import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string | null;
          date_of_birth: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone?: string | null;
          date_of_birth?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

let supabase: ReturnType<typeof createSupabaseClient<Database>> | undefined;

export function createClient() {
  if (supabase) {
    return supabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  supabase = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

export async function getSupabaseUserIdByEmail(
  email: string,
): Promise<string | null> {
  const client = createClient();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Failed to look up Supabase user:", error);
      throw new Error("Failed to look up the Supabase account.");
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) {
      return user.id;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}
