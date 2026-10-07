-- Seed: escalation chain for critical lab results
-- A critical lab alert (to the ordering doctor and the patient's nurse) not acknowledged in
-- 10 minutes goes to the charge nurses, 10 minutes later to all doctors, 10 minutes later
-- to the admins. Admin can change it on the Alerts page (Escalation, type "Critical lab result").
-- Idempotent: policy by its UNIQUE alert_type; steps only when the policy has none yet.

INSERT IGNORE INTO alert_escalation_policies (alert_type, applies_to, is_active, created_at)
VALUES ('critical_lab', 'critical', 1, NOW());

SET @policy = (SELECT id FROM alert_escalation_policies WHERE alert_type = 'critical_lab');
SET @empty = (SELECT COUNT(*) = 0 FROM alert_escalation_steps WHERE policy_id = @policy);

INSERT INTO alert_escalation_steps (policy_id, step_no, wait_minutes, target_type, target_role)
SELECT @policy, s.step_no, s.wait_minutes, 'role', s.target_role
FROM (SELECT 1 AS step_no, 10 AS wait_minutes, 'charge_nurse' AS target_role
      UNION ALL SELECT 2, 10, 'doctor'
      UNION ALL SELECT 3, 10, 'admin') s
WHERE @empty = 1;
