-- ==========================================================
-- Seed 051: Unified System & Security Logs & User Sessions
-- Populates active sessions and grants unified console capabilities
-- ==========================================================

-- 1. Grant admin_system_logs capability to admin role
INSERT INTO role_permissions (role_id, capability, created_at)
SELECT r.id, 'admin_system_logs', NOW()
FROM roles r
WHERE r.name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role_id = r.id AND rp.capability = 'admin_system_logs'
  );

-- 2. Populate user_session_histories with representative active and historical sessions
INSERT IGNORE INTO `user_session_histories` 
(`id`, `user_id`, `session_id`, `ip_address`, `user_agent`, `device_type`, `login_at`, `last_activity_at`, `logout_at`, `is_active`, `revoked_by`, `revocation_reason`)
VALUES
(
    10,
    1,
    'sess_adm_live_99812401',
    '192.168.1.105',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) USIntellixHMS/2.0 Chrome/124.0.0.0',
    'Desktop',
    DATE_SUB(NOW(), INTERVAL 45 MINUTE),
    DATE_SUB(NOW(), INTERVAL 2 MINUTE),
    NULL,
    1,
    NULL,
    NULL
),
(
    11,
    10,
    'sess_doc_tablet_77182902',
    '192.168.1.142',
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    'Tablet / Mobile',
    DATE_SUB(NOW(), INTERVAL 3 HOUR),
    DATE_SUB(NOW(), INTERVAL 8 MINUTE),
    NULL,
    1,
    NULL,
    NULL
),
(
    12,
    4,
    'sess_rec_frontdesk_441203',
    '192.168.1.118',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Desktop',
    DATE_SUB(NOW(), INTERVAL 5 HOUR),
    DATE_SUB(NOW(), INTERVAL 14 MINUTE),
    NULL,
    1,
    NULL,
    NULL
),
(
    13,
    3,
    'sess_adm2_term_551029',
    '192.168.1.121',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
    'Desktop',
    DATE_SUB(NOW(), INTERVAL 8 HOUR),
    DATE_SUB(NOW(), INTERVAL 6 HOUR),
    DATE_SUB(NOW(), INTERVAL 6 HOUR),
    0,
    NULL,
    'Normal User Logout'
),
(
    14,
    11,
    'sess_doc2_revoked_11902',
    '192.168.1.166',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Desktop',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 22 HOUR),
    DATE_SUB(NOW(), INTERVAL 22 HOUR),
    0,
    1,
    'Administrator Revocation: Inactivity timeout and workstation unattended'
),
(
    15,
    6,
    'sess_rec2_locked_881923',
    '10.0.0.45',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Desktop',
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    0,
    1,
    'Security Lockout: 5 Consecutive Failed Password Challenges'
);
