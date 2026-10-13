-- CareFlow clinic access model.
-- Clinician identity and admin access come from a one-to-one Supabase Auth profile.

CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  specialty text,
  practice_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bootstrap profiles for existing staff whose email already maps to a Supabase Auth user.
INSERT INTO public.doctor_profiles (user_id, full_name, role, is_active)
SELECT
  auth_user.id,
  COALESCE(NULLIF(BTRIM(legacy_user.name), ''), SPLIT_PART(auth_user.email, '@', 1)),
  'admin',
  true
FROM public.users AS legacy_user
JOIN auth.users AS auth_user
  ON LOWER(auth_user.email) = LOWER(legacy_user.email)
WHERE legacy_user.role IN ('doctor', 'admin')
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin', is_active = true;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_clinic_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.doctor_profiles AS clinician
    WHERE clinician.user_id = auth.uid()
      AND clinician.role = 'admin'
      AND clinician.is_active
  );
$$;

REVOKE ALL ON FUNCTION private.is_clinic_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_clinic_admin() TO authenticated;

-- Remove the incomplete owner-only policy set and rebuild all policies deliberately.
DO $$
DECLARE
  table_name text;
  policy_row record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'doctor_profiles', 'patients', 'med_appointments', 'med_records',
    'med_vitals', 'med_invoices', 'revenue', 'invoices', 'customers', 'users'
  ] LOOP
    FOR policy_row IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, table_name);
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctor_profiles_read_directory
ON public.doctor_profiles FOR SELECT TO authenticated
USING (is_active OR user_id = (SELECT auth.uid()));

CREATE POLICY patients_read_clinic_or_self
ON public.patients FOR SELECT TO authenticated
USING (
  (SELECT private.is_clinic_admin())
  OR portal_user_id = (SELECT auth.uid())
  OR (
    user_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.doctor_profiles AS clinician
      WHERE clinician.user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY patients_insert_clinic_admin
ON public.patients FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY patients_update_clinic_admin
ON public.patients FOR UPDATE TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY patients_delete_clinic_admin
ON public.patients FOR DELETE TO authenticated
USING ((SELECT private.is_clinic_admin()));

CREATE POLICY med_appointments_read_clinic_or_self
ON public.med_appointments FOR SELECT TO authenticated
USING (
  (SELECT private.is_clinic_admin())
  OR EXISTS (
    SELECT 1 FROM public.patients AS patient
    WHERE patient.id = patient_id
      AND (patient.portal_user_id = (SELECT auth.uid()) OR patient.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY med_appointments_insert_clinic_or_self
ON public.med_appointments FOR INSERT TO authenticated
WITH CHECK (
  (SELECT private.is_clinic_admin())
  OR (
    status = 'scheduled'
    AND start_time > now()
    AND end_time > start_time
    AND EXISTS (
      SELECT 1 FROM public.patients AS patient
      WHERE patient.id = patient_id
        AND (patient.portal_user_id = (SELECT auth.uid()) OR patient.user_id = (SELECT auth.uid()))
    )
    AND EXISTS (
      SELECT 1 FROM public.doctor_profiles AS clinician
      WHERE clinician.user_id = doctor_id AND clinician.role = 'admin' AND clinician.is_active
    )
  )
);

CREATE POLICY med_appointments_update_clinic_admin
ON public.med_appointments FOR UPDATE TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_appointments_delete_clinic_admin
ON public.med_appointments FOR DELETE TO authenticated
USING ((SELECT private.is_clinic_admin()));

CREATE POLICY med_records_read_clinic_or_self
ON public.med_records FOR SELECT TO authenticated
USING (
  (SELECT private.is_clinic_admin())
  OR EXISTS (
    SELECT 1 FROM public.patients AS patient
    WHERE patient.id = patient_id
      AND (patient.portal_user_id = (SELECT auth.uid()) OR patient.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY med_records_insert_clinic_admin
ON public.med_records FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_records_update_clinic_admin
ON public.med_records FOR UPDATE TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_records_delete_clinic_admin
ON public.med_records FOR DELETE TO authenticated
USING ((SELECT private.is_clinic_admin()));

CREATE POLICY med_vitals_read_clinic_or_self
ON public.med_vitals FOR SELECT TO authenticated
USING (
  (SELECT private.is_clinic_admin())
  OR EXISTS (
    SELECT 1 FROM public.patients AS patient
    WHERE patient.id = patient_id
      AND (patient.portal_user_id = (SELECT auth.uid()) OR patient.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY med_vitals_insert_clinic_admin
ON public.med_vitals FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_vitals_update_clinic_admin
ON public.med_vitals FOR UPDATE TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_vitals_delete_clinic_admin
ON public.med_vitals FOR DELETE TO authenticated
USING ((SELECT private.is_clinic_admin()));

CREATE POLICY med_invoices_read_clinic_or_self
ON public.med_invoices FOR SELECT TO authenticated
USING (
  (SELECT private.is_clinic_admin())
  OR EXISTS (
    SELECT 1 FROM public.patients AS patient
    WHERE patient.id = patient_id
      AND (patient.portal_user_id = (SELECT auth.uid()) OR patient.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY med_invoices_insert_clinic_admin
ON public.med_invoices FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_invoices_update_clinic_admin
ON public.med_invoices FOR UPDATE TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY med_invoices_delete_clinic_admin
ON public.med_invoices FOR DELETE TO authenticated
USING ((SELECT private.is_clinic_admin()));

CREATE POLICY legacy_financials_clinic_admin
ON public.revenue FOR ALL TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY legacy_invoices_clinic_admin
ON public.invoices FOR ALL TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

CREATE POLICY legacy_customers_clinic_admin
ON public.customers FOR ALL TO authenticated
USING ((SELECT private.is_clinic_admin()))
WITH CHECK ((SELECT private.is_clinic_admin()));

-- `public.users` is retained for legacy records, but credentials and roles are no
-- longer read from it. Block all Data API access to that table.

REVOKE ALL ON TABLE public.doctor_profiles, public.patients, public.med_appointments,
  public.med_records, public.med_vitals, public.med_invoices,
  public.revenue, public.invoices, public.customers
FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.doctor_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patients, public.med_appointments,
  public.med_records, public.med_vitals, public.med_invoices,
  public.revenue, public.invoices, public.customers
TO authenticated;

GRANT ALL ON TABLE public.doctor_profiles, public.patients, public.med_appointments,
  public.med_records, public.med_vitals, public.med_invoices,
  public.revenue, public.invoices, public.customers
TO service_role;

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON public.patients (user_id);
CREATE INDEX IF NOT EXISTS patients_portal_user_id_idx ON public.patients (portal_user_id);
CREATE INDEX IF NOT EXISTS med_appointments_patient_start_idx ON public.med_appointments (patient_id, start_time);
CREATE INDEX IF NOT EXISTS med_appointments_doctor_status_start_idx ON public.med_appointments (doctor_id, status, start_time);
CREATE INDEX IF NOT EXISTS med_records_patient_created_idx ON public.med_records (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS med_vitals_patient_timestamp_idx ON public.med_vitals (patient_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS med_invoices_owner_user_id_idx ON public.med_invoices (owner_user_id);
CREATE INDEX IF NOT EXISTS med_invoices_patient_created_idx ON public.med_invoices (patient_id, created_at DESC);

