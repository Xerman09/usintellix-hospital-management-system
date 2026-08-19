-- =============================================
-- Alter: encounter_vitals
-- Expands the 7-field Vitals form into the full LOINC-coded vitals
-- entry table: Weight, Height/Length, BP Systolic/Diastolic, Pulse,
-- Respiration, Temperature (+ location), Oxygen Saturation/Flow Rate,
-- Inhaled Oxygen Concentration, Head/Waist Circumference, plus an
-- abnormal-flag column per measurement and a free-text Other Notes
-- field. height_cm/weight_kg are dropped (no rows have ever had data
-- in them) in favor of height/weight stored directly in the units the
-- form now enters them in (in/lbs) -- no metric conversion layer.
-- BMI/BMI status stay computed server-side, now from height(in)/weight(lbs).
-- =============================================

ALTER TABLE encounter_vitals

    DROP COLUMN height_cm,

    DROP COLUMN weight_kg,

    ADD COLUMN weight DECIMAL(6,2) NULL AFTER encounter_id,
    ADD COLUMN weight_abn VARCHAR(20) NULL AFTER weight,

    ADD COLUMN height DECIMAL(6,2) NULL AFTER weight_abn,
    ADD COLUMN height_abn VARCHAR(20) NULL AFTER height,

    ADD COLUMN bp_systolic INT NULL AFTER height_abn,
    ADD COLUMN bp_systolic_abn VARCHAR(20) NULL AFTER bp_systolic,

    ADD COLUMN bp_diastolic INT NULL AFTER bp_systolic_abn,
    ADD COLUMN bp_diastolic_abn VARCHAR(20) NULL AFTER bp_diastolic,

    ADD COLUMN pulse INT NULL AFTER bp_diastolic_abn,
    ADD COLUMN pulse_abn VARCHAR(20) NULL AFTER pulse,

    ADD COLUMN respiration INT NULL AFTER pulse_abn,
    ADD COLUMN respiration_abn VARCHAR(20) NULL AFTER respiration,

    ADD COLUMN temperature DECIMAL(5,2) NULL AFTER respiration_abn,
    ADD COLUMN temperature_abn VARCHAR(20) NULL AFTER temperature,
    ADD COLUMN temp_location VARCHAR(30) NULL AFTER temperature_abn,

    ADD COLUMN oxygen_saturation_abn VARCHAR(20) NULL AFTER oxygen_saturation,
    ADD COLUMN oxygen_flow_rate_abn VARCHAR(20) NULL AFTER oxygen_flow_rate,
    ADD COLUMN inhaled_oxygen_concentration_abn VARCHAR(20) NULL AFTER inhaled_oxygen_concentration,

    ADD COLUMN head_circumference DECIMAL(6,2) NULL AFTER inhaled_oxygen_concentration_abn,
    ADD COLUMN head_circumference_abn VARCHAR(20) NULL AFTER head_circumference,

    ADD COLUMN waist_circumference DECIMAL(6,2) NULL AFTER head_circumference_abn,
    ADD COLUMN waist_circumference_abn VARCHAR(20) NULL AFTER waist_circumference,

    ADD COLUMN other_notes TEXT NULL AFTER bmi_status;
