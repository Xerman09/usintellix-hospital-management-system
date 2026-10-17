-- ==========================================================
-- Seed 050: Granular Entity Data Change History (audit_trail_diffs)
-- Realistic before-and-after snapshots and field-level diffs
-- for HIPAA Compliance Audit Trail console demonstration.
-- ==========================================================

-- 1. Grant admin_audit_diffs capability to admin role
INSERT INTO role_permissions (role_id, capability, created_at)
SELECT r.id, 'admin_audit_diffs', NOW()
FROM roles r
WHERE r.name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role_id = r.id AND rp.capability = 'admin_audit_diffs'
  );

-- 2. Populate realistic entity data diff records
INSERT IGNORE INTO `audit_trail_diffs` 
(`id`, `table_name`, `record_id`, `action`, `changed_fields`, `old_values`, `new_values`, `user_id`, `ip_address`, `user_agent`, `created_at`)
VALUES
(
    1,
    'hospital_rooms',
    5,
    'UPDATE',
    JSON_ARRAY('daily_rate', 'room_type', 'notes'),
    JSON_OBJECT(
        'room_number', '302-B',
        'daily_rate', '150.00',
        'room_type', 'Semi-Private',
        'notes', 'Standard double occupancy unit'
    ),
    JSON_OBJECT(
        'room_number', '302-B',
        'daily_rate', '250.00',
        'room_type', 'Private Suite',
        'notes', 'Converted to private suite with telemetry monitoring and dedicated sanitary facility'
    ),
    1,
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0',
    DATE_SUB(NOW(), INTERVAL 2 HOUR)
),
(
    2,
    'patients',
    101,
    'UPDATE',
    JSON_ARRAY('address', 'phone_number', 'emergency_contact'),
    JSON_OBJECT(
        'patient_mrn', 'MRN-2026-00101',
        'first_name', 'Eleanor',
        'last_name', 'Vance',
        'address', '742 Evergreen Terrace, Springfield, OR',
        'phone_number', '555-0134',
        'emergency_contact', 'Jane Vance (Sister) - 555-0135'
    ),
    JSON_OBJECT(
        'patient_mrn', 'MRN-2026-00101',
        'first_name', 'Eleanor',
        'last_name', 'Vance',
        'address', '1048 Willow Creek Road, Suite 4B, Portland, OR 97201',
        'phone_number', '555-0899',
        'emergency_contact', 'Robert Vance (Spouse) - 555-0892'
    ),
    2,
    '192.168.1.142',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    DATE_SUB(NOW(), INTERVAL 5 HOUR)
),
(
    3,
    'patient_allergies',
    12,
    'UPDATE',
    JSON_ARRAY('severity', 'reaction', 'clinical_notes'),
    JSON_OBJECT(
        'allergen', 'Cefazolin / Cephalosporins',
        'severity', 'Moderate',
        'reaction', 'Cutaneous erythema, urticaria',
        'clinical_notes', 'Patient experienced localized rash following surgical prophylaxis in 2021.'
    ),
    JSON_OBJECT(
        'allergen', 'Cefazolin / Cephalosporins',
        'severity', 'Severe / Anaphylactic',
        'reaction', 'Acute bronchospasm, angioedema, hypotension',
        'clinical_notes', 'Critical upgrade: Inadvertent re-exposure provoked immediate respiratory distress and laryngeal edema. IM Epinephrine 0.3mg required. Absolute contraindication across all beta-lactams.'
    ),
    2,
    '192.168.1.118',
    'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) Mobile/15E148',
    DATE_SUB(NOW(), INTERVAL 12 HOUR)
),
(
    4,
    'hospital_equipment_assets',
    1,
    'UPDATE',
    JSON_ARRAY('maintenance_status', 'last_calibration_date', 'next_calibration_due', 'calibration_vendor'),
    JSON_OBJECT(
        'asset_tag', 'EQ-VENT-001',
        'equipment_name', 'Hamilton G5 ICU Ventilator',
        'maintenance_status', 'Needs Calibration',
        'last_calibration_date', '2025-10-10',
        'next_calibration_due', '2026-10-10',
        'calibration_vendor', 'BioMed Tech Solutions LLC'
    ),
    JSON_OBJECT(
        'asset_tag', 'EQ-VENT-001',
        'equipment_name', 'Hamilton G5 ICU Ventilator',
        'maintenance_status', 'Operational',
        'last_calibration_date', '2026-10-16',
        'next_calibration_due', '2027-10-16',
        'calibration_vendor', 'Precision Medical Metrology Services'
    ),
    1,
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0',
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
    5,
    'prescriptions',
    45,
    'UPDATE',
    JSON_ARRAY('dosage', 'frequency', 'duration_days', 'special_instructions'),
    JSON_OBJECT(
        'medication_name', 'Metoprolol Succinate ER',
        'dosage', '25 mg',
        'frequency', 'Once Daily (QD)',
        'duration_days', 30,
        'special_instructions', 'Take in the morning with meals. Check radial pulse prior to administration.'
    ),
    JSON_OBJECT(
        'medication_name', 'Metoprolol Succinate ER',
        'dosage', '50 mg',
        'frequency', 'Once Daily (QD)',
        'duration_days', 60,
        'special_instructions', 'Dose titrated upward due to persistent post-infarct tachycardia. Target resting HR 60-70 bpm.'
    ),
    3,
    '192.168.1.121',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/124.0',
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
    6,
    'employees',
    8,
    'UPDATE',
    JSON_ARRAY('employment_status', 'department_id', 'duty_scope'),
    JSON_OBJECT(
        'employee_code', 'EMP-1008',
        'full_name', 'Sarah Jenkins, RN',
        'employment_status', 'Suspended',
        'department_id', 3,
        'duty_scope', 'Secondary Float'
    ),
    JSON_OBJECT(
        'employee_code', 'EMP-1008',
        'full_name', 'Sarah Jenkins, RN',
        'employment_status', 'Active',
        'department_id', 1,
        'duty_scope', 'Primary Clinical ICU'
    ),
    1,
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0',
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
    7,
    'hospital_rooms',
    18,
    'CREATE',
    JSON_ARRAY('room_number', 'room_type', 'daily_rate', 'ward_id', 'capacity'),
    NULL,
    JSON_OBJECT(
        'room_number', 'ICU-ISO-01',
        'room_type', 'Negative Pressure Isolation',
        'daily_rate', '650.00',
        'ward_id', 2,
        'capacity', 1,
        'status', 'Available'
    ),
    1,
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0',
    DATE_SUB(NOW(), INTERVAL 3 DAY)
),
(
    8,
    'clinic_operating_schedules',
    99,
    'DELETE',
    JSON_ARRAY('id', 'department_id', 'day_of_week', 'start_time', 'end_time'),
    JSON_OBJECT(
        'id', 99,
        'department_id', 4,
        'day_of_week', 'Sunday',
        'start_time', '08:00:00',
        'end_time', '12:00:00',
        'slot_duration_minutes', 30,
        'max_daily_capacity', 15
    ),
    NULL,
    1,
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0',
    DATE_SUB(NOW(), INTERVAL 4 DAY)
);
