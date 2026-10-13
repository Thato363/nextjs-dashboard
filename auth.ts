import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import postgres from "postgres";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { users as demoUsers } from "@/app/lib/placeholder-data";

const databaseUrl = process.env.POSTGRES_URL;
const sql = databaseUrl ? postgres(databaseUrl, { ssl: "require" }) : null;
let supabaseAuthClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSupabaseAuthClient() {
  if (supabaseAuthClient) return supabaseAuthClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  supabaseAuthClient = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAuthClient;
}

function isMissingDatabaseTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message = String((error as { message?: string }).message ?? "");
  const code = (error as { code?: string }).code;

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.toLowerCase().includes("could not find the table") ||
    message.toLowerCase().includes("does not exist") ||
    message.toLowerCase().includes("relation") && message.toLowerCase().includes("does not exist")
  );
}

async function getUser(email: string): Promise<User | undefined> {
  const demoUser = demoUsers.find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
  );

  if (!sql) {
    console.warn("POSTGRES_URL is not set. Falling back to demo credentials.");
    return demoUser as User | undefined;
  }

  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0] ?? demoUser;
  } catch (error) {
    if (isMissingDatabaseTableError(error)) {
      console.warn("Database table not found. Falling back to demo credentials.");
      return demoUser as User | undefined;
    }

    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (user && await bcrypt.compare(password, user.password)) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role ?? "patient",
            };
          }

          const supabase = getSupabaseAuthClient();
          if (!supabase) return null;

          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.user) return null;

          const role = data.user.app_metadata?.role ?? "patient";

          return {
            id: data.user.id,
            name: data.user.user_metadata?.full_name ?? data.user.email ?? email,
            email: data.user.email ?? email,
            role: String(role),
          };
        }

        return null;
      },
    }),
  ],
});
