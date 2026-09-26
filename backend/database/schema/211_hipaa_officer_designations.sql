-- ==============================================================================
-- Migration 211: Official HIPAA Privacy & Security Officer Designation
-- Statutory Authority: 45 CFR § 164.308(a)(2) & 45 CFR § 164.530(a)
-- Priority: 🟢 LOW / ADMINISTRATIVE (Tier 3 - Parameter 10)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hipaa_officer_designations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    officer_type ENUM('privacy_officer', 'security_officer') NOT NULL UNIQUE,
    employee_id INT NULL,
    user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    extension VARCHAR(20) NULL,
    physical_office_address VARCHAR(255) NULL,
    appointment_date DATE NOT NULL,
    responsibilities_scope TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    appointed_by_name VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    INDEX idx_officer_type (officer_type),
    INDEX idx_officer_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default baseline designations for both statutory roles
INSERT INTO hipaa_officer_designations (
    officer_type,
    employee_id,
    user_id,
    full_name,
    title,
    email,
    phone,
    extension,
    physical_office_address,
    appointment_date,
    responsibilities_scope,
    is_active,
    appointed_by_name,
    notes,
    created_at,
    updated_at
) VALUES 
(
    'privacy_officer',
    NULL,
    NULL,
    'Sarah Jenkins, JD, CHPC',
    'Chief Privacy & Compliance Officer',
    'privacy@usintellix-hospital.com',
    '(800) 555-0199',
    '4040',
    '100 Healthcare Boulevard, Suite 500, Medical District, NY 10001',
    '2024-01-15',
    'Responsible for the development, implementation, and maintenance of hospital-wide HIPAA Privacy Rule policies and procedures under 45 CFR § 164.530(a)(1)(i), receiving and investigating patient privacy grievances under § 164.530(a)(1)(ii), overseeing Notice of Privacy Practices dissemination (§ 164.520), Designated Record Set requests (§ 164.524), PHI amendment workflows (§ 164.526), Accounting of Disclosures (§ 164.528), and Business Associate Agreements (§ 164.502(e)).',
    1,
    'Board of Directors / Chief Executive Officer',
    'Official statutory designation pursuant to 45 CFR § 164.530(a). Documentation retained per 6-year retention mandate (§ 164.530(j)).',
    NOW(),
    NOW()
),
(
    'security_officer',
    NULL,
    NULL,
    'Marcus Vance, CISSP, HCISPP',
    'Chief Information Security Officer',
    'security@usintellix-hospital.com',
    '(800) 555-0199',
    '4088',
    '100 Healthcare Boulevard, Suite 500, Medical District, NY 10001',
    '2024-01-15',
    'Responsible for the development, implementation, and operational oversight of technical, administrative, and physical safeguards required by the HIPAA Security Rule under 45 CFR § 164.308(a)(2), conducting enterprise security risk analyses (§ 164.308(a)(1)(ii)(A)), incident response and 4-factor breach risk evaluations (§ 164.402), disaster recovery verification (§ 164.308(a)(7)), role-based access management (§ 164.312(a)), and cryptographic integrity auditing (§ 164.312(b)).',
    1,
    'Board of Directors / Chief Executive Officer',
    'Official statutory designation pursuant to 45 CFR § 164.308(a)(2). Documentation retained per 6-year retention mandate (§ 164.316(b)).',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    title = VALUES(title),
    email = VALUES(email),
    phone = VALUES(phone),
    extension = VALUES(extension),
    physical_office_address = VALUES(physical_office_address),
    appointment_date = VALUES(appointment_date),
    responsibilities_scope = VALUES(responsibilities_scope),
    is_active = VALUES(is_active),
    updated_at = NOW();
