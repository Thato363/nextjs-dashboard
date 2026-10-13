# CareFlow Clinic

## What it does
This dashboard helps a clinic manage patient records, appointments, clinical history, and billing from one place. Billing records track medical aid, card, cash, bank transfer, and other payments with paid, pending, or denied status.

## Configuration
Configure these server variables in `.env.local` for development and in your hosting provider for deployment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL`, and `AUTH_SECRET`.

The Supabase schema is already provisioned in the connected project. Keep the service-role key server-only and never expose it through a `NEXT_PUBLIC_` variable.

Clinic staff accounts use the `public.users.role` field (`doctor` or `admin`). Patients sign in with Supabase Auth; a staff member links their account to the patient profile by entering the same email on the patient form. Patient accounts without a linked profile are sent to a profile-linking notice.

## How to run it
1. Configure the required environment variables listed above.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the app locally:
   ```bash
   pnpm run dev
   ```
4. Open http://localhost:3000; the app opens at the clinic sign-in page.
5. Sign in with an account configured for your authentication setup.

## Tech stack and why
- Next.js App Router for the UI and route structure
- TypeScript for typed data flow
- Tailwind CSS for the dashboard layout and forms
- NextAuth with credentials for protected dashboard routes
- Supabase + Postgres for patient, appointment, and auth-backed records
- Zod for form validation and safer server-side data checks

## Deployment checks
- Verify sign-in and protected routes against the production authentication configuration.
- Test patient ownership with separate staff accounts and confirm database access policies.
- Confirm the production deployment has the required environment variables and live patient data.

## Pre-freeze smoke checklist
Use this as the final production check before Monday.

- [ ] 1. Production URL loads, signed out and signed in
- [ ] 2. README includes the live link and run steps
- [ ] 3. Login protects the dashboard for unauthenticated users
- [ ] 4. Patient create, edit, and delete flows work
- [ ] 5. Appointments are linked to a patient and can be created, edited, and deleted
- [ ] 6. RLS is proven with a second user and ownership checks return not-found or 42501
- [ ] 7. Chart 1 states a clear question and uses labelled axes
- [ ] 8. Chart 2 uses a different shape to answer a second question
- [ ] 9. Proposal is in [PROPOSAL.md](PROPOSAL.md)
- [ ] 10. No secrets are committed; the newest production deployment is ready and the repo contains only environment placeholders

## Clinic workflow
- Sign in with an authorized staff account.
- Open the patient list and create a patient.
- Open the appointment flow and attach that patient.
- Confirm the dashboard updates and the chart reflects the clinic signal.
- Sign out and confirm the protected routes redirect back to login.

