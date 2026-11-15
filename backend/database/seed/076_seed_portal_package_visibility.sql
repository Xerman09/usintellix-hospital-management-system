-- Seed: patient-facing wording for the priced packages (Phase M16)
-- Subsystem: Patient Portal / Billing. One row per row in billing_service_packages,
-- carrying the words a patient sees and an explicit decision about whether that package
-- is shown at all.
--
-- Why one row per package rather than a single switch: package_name is written for
-- staff. "Laparoscopic Cholecystectomy Surgical Package" is correct and no patient
-- looking up the cost of gallbladder surgery will search for it. The same reasoning as
-- seed 074 for health-maintenance items -- the clinical register and the patient
-- register are different, and the mapping is a decision somebody has to make once.
--
-- All four packages on file are shown. Each is a real, bounded, priced thing a patient
-- might plan for, which is exactly what an estimate is useful for. Two of them carry no
-- usable line-by-line breakdown (see the header of schema 339), and that is handled by
-- the estimate rather than by hiding the package: the inclusions and exclusions prose is
-- the genuinely useful part and it is sound on all four.
--
-- The wording below describes what the package is, in the words a patient would use,
-- and deliberately says nothing about whether it is the right treatment for anybody.
-- Pricing is not clinical advice and this text must not drift into sounding like it.
--
-- NEEDS SIGN-OFF: a billing lead should confirm these labels and blurbs, and in
-- particular that publishing both the standard and the discounted price is intended.
--
-- Idempotency: INSERT ... SELECT ... WHERE NOT EXISTS per row, keyed on package_id,
-- which carries a UNIQUE constraint. Re-running changes nothing and leaves a label an
-- admin has since reworded alone.

SET NAMES utf8mb4;

-- --------------------------------------------------------------------------
-- PKG-MAT-001 -- Normal Spontaneous Delivery
-- The one package whose itemisation reconciles (items total 24,500, matching the
-- discounted price exactly), so this is the one a patient can see line by line.
-- --------------------------------------------------------------------------
INSERT INTO `portal_package_visibility`
    (`package_id`, `patient_label`, `patient_blurb`, `is_patient_visible`, `hide_reason`, `sequence`)
SELECT p.id,
    'Giving birth — normal delivery',
    'A two-day stay for a vaginal birth, covering the delivery room, your obstetrician, routine medicines, and the newborn checks and first vaccines.',
    1, NULL, 10
FROM `billing_service_packages` p
WHERE p.package_code = 'PKG-MAT-001'
  AND NOT EXISTS (SELECT 1 FROM `portal_package_visibility` v WHERE v.package_id = p.id);

-- --------------------------------------------------------------------------
-- PKG-MAT-002 -- Cesarean Section
-- Shown. It has NO package items at all while being priced at 48,000, so no
-- breakdown is possible -- but a caesarean is one of the most common things an
-- expecting patient needs a figure for, and the inclusions prose is complete.
-- --------------------------------------------------------------------------
INSERT INTO `portal_package_visibility`
    (`package_id`, `patient_label`, `patient_blurb`, `is_patient_visible`, `hide_reason`, `sequence`)
SELECT p.id,
    'Giving birth — caesarean section',
    'A three-day stay for a caesarean birth, covering the operating room, the anaesthetic, your obstetrician and the baby doctor, and the newborn checks and first vaccines.',
    1, NULL, 20
FROM `billing_service_packages` p
WHERE p.package_code = 'PKG-MAT-002'
  AND NOT EXISTS (SELECT 1 FROM `portal_package_visibility` v WHERE v.package_id = p.id);

-- --------------------------------------------------------------------------
-- PKG-SUR-001 -- Laparoscopic Cholecystectomy
-- "Gallbladder removal" is what a patient will have been told, and what they
-- will search for.
-- --------------------------------------------------------------------------
INSERT INTO `portal_package_visibility`
    (`package_id`, `patient_label`, `patient_blurb`, `is_patient_visible`, `hide_reason`, `sequence`)
SELECT p.id,
    'Gallbladder removal (keyhole surgery)',
    'A three-day stay for keyhole removal of the gallbladder, covering the operating room, the general anaesthetic, your surgeon and assistant, and pain relief afterwards.',
    1, NULL, 30
FROM `billing_service_packages` p
WHERE p.package_code = 'PKG-SUR-001'
  AND NOT EXISTS (SELECT 1 FROM `portal_package_visibility` v WHERE v.package_id = p.id);

-- --------------------------------------------------------------------------
-- PKG-EXC-001 -- Executive Health Screening
-- A same-day outpatient package, so the "three-day stay" framing above does not
-- apply and the blurb says what actually happens.
-- --------------------------------------------------------------------------
INSERT INTO `portal_package_visibility`
    (`package_id`, `patient_label`, `patient_blurb`, `is_patient_visible`, `hide_reason`, `sequence`)
SELECT p.id,
    'Full health check (one day)',
    'A single day of tests with a doctor going through the results with you: blood tests, blood sugar, cholesterol, kidney and liver checks, a heart tracing, a chest X-ray and an abdominal scan.',
    1, NULL, 40
FROM `billing_service_packages` p
WHERE p.package_code = 'PKG-EXC-001'
  AND NOT EXISTS (SELECT 1 FROM `portal_package_visibility` v WHERE v.package_id = p.id);
