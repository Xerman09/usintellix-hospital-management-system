-- =====================================================================
-- Seed: 057_seed_patient_identity_verification.sql
-- Description: Seed sample official identity document verifications
-- =====================================================================

UPDATE `patients`
SET `identity_status` = 'Verified',
    `id_document_type` = 'Passport',
    `id_document_number` = 'P8942150B',
    `verified_by` = 1,
    `verified_at` = NOW(),
    `verification_notes` = 'Original DFA Philippine Passport presented and verified physically at Admissions.'
WHERE `id` = 2;

UPDATE `patients`
SET `identity_status` = 'Pending Verification',
    `id_document_type` = 'Driver\'s License',
    `id_document_number` = 'N02-18-932140',
    `verification_notes` = 'Photocopy presented; waiting for physical card verification on next consult.'
WHERE `id` = 3;

UPDATE `patients`
SET `identity_status` = 'Restricted',
    `id_document_type` = 'National ID',
    `id_document_number` = '7142-9981-3420-1129',
    `verification_notes` = 'Document flagged for name spelling discrepancy against PSA birth certificate.'
WHERE `id` = 4;
