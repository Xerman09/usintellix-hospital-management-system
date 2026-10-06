-- Seed: default alert escalation chain
-- The '*' policy (every alert type without its own): a critical alert not acknowledged in
-- 5 minutes goes to all doctors, 5 minutes later to all admins. Admin can change it on the
-- Alerts page (Escalation). Idempotent: policy by its UNIQUE alert_type, steps only when the
-- policy has none yet.

INSERT IGNORE INTO alert_escalation_policies (alert_type, applies_to, is_active, created_at)
VALUES ('*', 'critical', 1, NOW());

SET @policy = (SELECT id FROM alert_escalation_policies WHERE alert_type = '*');

INSERT INTO alert_escalation_steps (policy_id, step_no, wait_minutes, target_type, target_role)
SELECT @policy, 1, 5, 'role', 'doctor' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM alert_escalation_steps WHERE policy_id = @policy);

INSERT INTO alert_escalation_steps (policy_id, step_no, wait_minutes, target_type, target_role)
SELECT @policy, 2, 5, 'role', 'admin' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM alert_escalation_steps WHERE policy_id = @policy AND step_no = 2)
  AND (SELECT COUNT(*) FROM alert_escalation_steps WHERE policy_id = @policy) = 1
  AND EXISTS (SELECT 1 FROM alert_escalation_steps WHERE policy_id = @policy AND step_no = 1 AND target_role = 'doctor' AND wait_minutes = 5);
