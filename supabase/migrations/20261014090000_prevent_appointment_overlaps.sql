-- Stop overlapping appointments at the database level.
--
-- The booking API already checks for clashes, but a check followed by an insert can race:
-- two people booking the same slot at the same moment can both pass the check. These
-- constraints make the database the final authority.
--
-- Only active appointments (scheduled / checked_in) hold a time slot. Cancelled, no-show and
-- completed appointments free it. Ranges are half-open ([start, end)) so back-to-back
-- appointments (one ending at 10:00, the next starting at 10:00) are allowed.
--
-- Before running this against a database with existing data, make sure no overlapping active
-- appointments exist for the same doctor or the same patient, otherwise adding a constraint fails.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.med_appointments
  ADD CONSTRAINT med_appointments_no_doctor_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('scheduled', 'checked_in'));

ALTER TABLE public.med_appointments
  ADD CONSTRAINT med_appointments_no_patient_overlap
  EXCLUDE USING gist (
    patient_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('scheduled', 'checked_in'));
