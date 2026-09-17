-- Seed: preference_types
-- Seeds a starter set of LOINC-eligible treatment/care preference
-- categories so the patient dashboard's "Care Experience Preferences"
-- widget has real, usable categories out of the box instead of an empty
-- dropdown. Idempotent via INSERT IGNORE against the UNIQUE `name` column.
-- loinc_code is deliberately left NULL rather than guessed -- the UI
-- already renders an honest "Not coded" state for that case -- admins can
-- attach the real code later from the Preference Types management screen.

INSERT IGNORE INTO preference_types (name, description, answer_options, created_at) VALUES
('Resuscitation Status', 'Patient or surrogate directed code status for resuscitation efforts.', 'Full Code\nDNR (Do Not Resuscitate)\nDNI (Do Not Intubate)\nDNR/DNI', NOW()),
('Organ Donation Preference', 'Whether the patient wishes to be registered as an organ/tissue donor.', 'Organ Donor\nNot a Donor\nUndecided', NOW()),
('Advance Directive on File', 'Whether a living will or healthcare power of attorney is on file for this patient.', 'Yes\nNo\nUnknown', NOW()),
('Religious/Cultural Affiliation Contact to Notify (reported)', 'Whether the patient wants their religious or cultural affiliation contact (e.g. chaplain, clergy) notified during their stay.', 'Clergy\nHospital Chaplain\nFamily Contact\nNone', NOW()),
('Preferred Spoken Language for Care Discussions', 'The patient''s preferred spoken language for discussing their care and treatment.', 'English\nFilipino\nCebuano\nOther', NOW());
