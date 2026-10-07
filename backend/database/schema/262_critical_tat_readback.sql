-- Critical lab read-back and the turnaround report (Critical lab values, Phase 3).
--
--  - critical_result_turnaround (the Critical TAT report, until now filled in by hand) gets a
--    row automatically for every critical lab alert (source 'auto', alert_id): the result
--    time, the first notification (the EHR alert) and who it went to.
--  - Acknowledging a critical lab alert records the read-back on that row: who was told,
--    when, how, that they read the result back, and what was done; the turnaround times and
--    compliance with the policy limit are worked out from it.
-- Safe to re-run.

ALTER TABLE critical_result_turnaround
    ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'manual' AFTER tracking_number,
    ADD COLUMN IF NOT EXISTS alert_id INT NULL AFTER source,
    ADD COLUMN IF NOT EXISTS recorded_by INT NULL AFTER notes;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crt_alert ON critical_result_turnaround (alert_id);
