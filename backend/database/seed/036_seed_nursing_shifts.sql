-- Seed: nursing shifts
-- The three 8-hour shifts: Day 7-3, Evening 3-11, Night 11-7 (the night shift belongs to the
-- date it starts on). Idempotent: INSERT IGNORE on the UNIQUE nursing_shifts.code.

INSERT IGNORE INTO nursing_shifts (code, name, start_time, end_time, sort_order, is_active, created_at) VALUES
('DAY', 'Day (7–3)', '07:00:00', '15:00:00', 1, 1, NOW()),
('EVE', 'Evening (3–11)', '15:00:00', '23:00:00', 2, 1, NOW()),
('NIGHT', 'Night (11–7)', '23:00:00', '07:00:00', 3, 1, NOW());
