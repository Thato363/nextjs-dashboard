import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createAdminClient } from "@/lib/supabase/server";

type DoctorProfile = {
  user_id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  // Keep credentials clients request-scoped; a shared client can retain another
  // sign-in's session between concurrent server requests.
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  const { data, error } = await createAdminClient()
    .from("doctor_profiles")
    .select("user_id, full_name, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load clinician profile:", error);
    throw new Error("Could not verify the clinician profile.");
  }

  return (data as DoctorProfile | null) ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const email = parsedCredentials.data.email.trim().toLowerCase();
        const supabase = getSupabaseAuthClient();
        if (!supabase) return null;

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: parsedCredentials.data.password,
        });
        if (error || !data.user) return null;

        const profile = await getDoctorProfile(data.user.id);
        if (profile && !profile.is_active) return null;

        return {
          id: data.user.id,
          name: profile?.full_name ?? data.user.user_metadata?.full_name ?? data.user.email ?? email,
          email: data.user.email ?? email,
          role: profile?.role === "admin" ? "admin" : "patient",
        };
      },
    }),
  ],
});

