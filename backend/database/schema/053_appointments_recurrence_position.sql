-- =============================================
-- Alter Table: appointments
-- The "Repeating Appointment" recurrence rule is not a numeric interval
-- + day/week/month cadence — it's an ordinal position ("Every", "2nd",
-- "3rd", "4th", "Last") combined with a day type ("Day", "Weekday",
-- "Weekend day", or a specific weekday), matching a standard monthly
-- recurrence pattern (e.g. "the 2nd Monday of every month", or
-- "every Monday" when position is "Every"). Renames/retypes the
-- columns that previously held the old numeric-interval + day/week/
-- month-unit model (never used in production — only 2 appointment
-- rows exist).
-- =============================================

ALTER TABLE appointments

    CHANGE COLUMN recurrence_interval recurrence_position VARCHAR(10) NULL,

    CHANGE COLUMN recurrence_unit recurrence_day_type
        ENUM('day', 'weekday', 'weekend_day', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        NULL;
