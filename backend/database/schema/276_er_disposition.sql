-- ER (module 12, Phase 4: disposition and the ER report).
--   * er_visits gets the disposition: home (discharged), admit (an inpatient admission and bed --
--     while no bed is free the patient waits in the ER: "boarding"), transfer to another facility,
--     the OR (a surgery request), or died. The visit closes then (closed_at = left the ER).
--   * New closed statuses: discharged | admitted | transferred | or | died (besides left | cancelled).
-- Safe to re-run.

SET NAMES utf8mb4;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'er_visits' AND column_name = 'disposition');
SET @s := IF(@c = 0,
    'ALTER TABLE er_visits
        ADD COLUMN disposition VARCHAR(12) DEFAULT NULL AFTER close_reason,
        ADD COLUMN disposition_at DATETIME DEFAULT NULL AFTER disposition,
        ADD COLUMN disposition_by INT DEFAULT NULL AFTER disposition_at,
        ADD COLUMN er_diagnosis VARCHAR(255) DEFAULT NULL AFTER disposition_by,
        ADD COLUMN disposition_notes VARCHAR(1000) DEFAULT NULL AFTER er_diagnosis,
        ADD COLUMN follow_up VARCHAR(255) DEFAULT NULL AFTER disposition_notes,
        ADD COLUMN admit_ward_id INT DEFAULT NULL AFTER follow_up,
        ADD COLUMN admit_details VARCHAR(500) DEFAULT NULL AFTER admit_ward_id,
        ADD COLUMN admission_id INT DEFAULT NULL AFTER admit_details,
        ADD COLUMN admitted_at DATETIME DEFAULT NULL AFTER admission_id,
        ADD COLUMN transfer_facility VARCHAR(150) DEFAULT NULL AFTER admitted_at,
        ADD COLUMN transfer_reason VARCHAR(255) DEFAULT NULL AFTER transfer_facility,
        ADD COLUMN transfer_mode VARCHAR(30) DEFAULT NULL AFTER transfer_reason,
        ADD COLUMN accepting_doctor VARCHAR(150) DEFAULT NULL AFTER transfer_mode,
        ADD COLUMN surgery_request_id INT DEFAULT NULL AFTER accepting_doctor,
        ADD COLUMN died_at DATETIME DEFAULT NULL AFTER surgery_request_id,
        ADD KEY idx_er_visits_arrived (arrived_at),
        ADD KEY idx_er_visits_admission (admission_id)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
