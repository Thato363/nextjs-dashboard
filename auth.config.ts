import type { NextAuthConfig } from "next-auth";

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "development-secret-change-me";

export const authConfig = {
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        (token as typeof token & { role?: string }).role =
          (user as typeof user & { role?: string }).role ?? "patient";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, {
          id: token.sub,
          role: (token as typeof token & { role?: string }).role ?? "patient",
        });
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) {
        if (!isLoggedIn) return false;

        const role = (auth.user as { role?: string }).role ?? "patient";
        const isPatient = role !== "doctor" && role !== "admin";
        const pathname = nextUrl.pathname;

        if (isPatient) {
          const allowedPatientRoute =
            pathname === "/dashboard/my-care" ||
            pathname === "/dashboard/appointments" ||
            pathname.startsWith("/dashboard/appointments/") ||
            /^\/dashboard\/patients\/[^/]+\/(appointments|medical-records)(\/.*)?$/.test(pathname);

          if (pathname === "/dashboard" || !allowedPatientRoute) {
            return Response.redirect(new URL("/dashboard/my-care", nextUrl));
          }
        } else if (pathname === "/dashboard/my-care" || pathname.startsWith("/dashboard/my-care/")) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }

        return true;
      } else if (isLoggedIn) {
        const role = (auth.user as { role?: string }).role ?? "patient";
        const destination = role === "doctor" || role === "admin" ? "/dashboard" : "/dashboard/my-care";
        return Response.redirect(new URL(destination, nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;

