<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';
require_once __DIR__ . '/../backend/config/database.php';

use App\Core\Database;

echo "=== MIGRATING & SEEDING HOSPITAL ROOM MANAGEMENT ===\n";

$db = Database::connection();

// 1. Run Schema 195
$sql = file_get_contents(__DIR__ . '/../backend/database/schema/195_hospital_buildings_and_rooms.sql');
$db->exec($sql);
echo "[OK] Schema 195_hospital_buildings_and_rooms.sql applied.\n";

// 2. Insert Buildings if empty
$buildingCount = $db->query("SELECT COUNT(*) FROM hospital_buildings")->fetchColumn();
if ($buildingCount == 0) {
    $buildings = [
        [
            'building_code' => 'MAIN',
            'building_name' => 'Main Hospital Building',
            'total_floors'  => 5,
            'location_description' => 'Central Hospital Campus - Houses General Medical, Surgical & Maternity Wings'
        ],
        [
            'building_code' => 'TWR-A',
            'building_name' => 'Critical Care & Specialty Tower',
            'total_floors'  => 6,
            'location_description' => 'North Tower - Intensive Care Units (ICU), Cardiac Care & Stepdown Units'
        ],
        [
            'building_code' => 'WEST',
            'building_name' => 'West Pavilion',
            'total_floors'  => 4,
            'location_description' => 'West Wing - Private Deluxe Suites, Pediatric Inpatient & Recovery Rooms'
        ],
        [
            'building_code' => 'ER-BLDG',
            'building_name' => 'Emergency & Trauma Complex',
            'total_floors'  => 2,
            'location_description' => 'Ground level adjacent to Ambulance Bay - Emergency bays and observation units'
        ]
    ];

    $stmt = $db->prepare("
        INSERT INTO hospital_buildings (building_code, building_name, total_floors, location_description, is_active)
        VALUES (:building_code, :building_name, :total_floors, :location_description, 1)
    ");

    foreach ($buildings as $b) {
        $stmt->execute($b);
    }
    echo "[OK] Seeded " . count($buildings) . " hospital buildings.\n";
}

// 3. Map buildings by code
$bldgs = $db->query("SELECT id, building_code FROM hospital_buildings")->fetchAll(PDO::FETCH_KEY_PAIR);

// 4. Map wards by code (if available)
$wards = $db->query("SELECT id, ward_code FROM hospital_wards")->fetchAll(PDO::FETCH_KEY_PAIR);
$wardMap = array_flip($wards);

// 5. Seed Rooms if empty
$roomCount = $db->query("SELECT COUNT(*) FROM hospital_rooms")->fetchColumn();
if ($roomCount == 0) {
    $rooms = [
        // Building MAIN - Floor 2 (Medical / Surgical)
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'MED',
            'floor_number'  => '2nd Floor',
            'room_number'   => 'Room 201',
            'room_name'     => 'General Medical Ward 201',
            'room_type'     => 'General Ward',
            'daily_rate'    => 75.00,
            'max_beds'      => 4,
            'gender_restriction' => 'Male Only',
            'amenities'     => 'Shared Bathroom, Central Oxygen, Nurse Call, Climate Control',
            'beds'          => ['MED-201-A', 'MED-201-B', 'MED-201-C', 'MED-201-D']
        ],
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'MED',
            'floor_number'  => '2nd Floor',
            'room_number'   => 'Room 202',
            'room_name'     => 'General Medical Ward 202',
            'room_type'     => 'General Ward',
            'daily_rate'    => 75.00,
            'max_beds'      => 4,
            'gender_restriction' => 'Female Only',
            'amenities'     => 'Shared Bathroom, Central Oxygen, Nurse Call, Climate Control',
            'beds'          => ['MED-202-A', 'MED-202-B', 'MED-202-C', 'MED-202-D']
        ],
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'MED',
            'floor_number'  => '2nd Floor',
            'room_number'   => 'Room 205',
            'room_name'     => 'Semi-Private Room 205',
            'room_type'     => 'Semi-Private',
            'daily_rate'    => 150.00,
            'max_beds'      => 2,
            'gender_restriction' => 'All',
            'amenities'     => 'Semi-Private Bath, Cable TV, Recliner, WiFi, Central O2',
            'beds'          => ['MED-205-A', 'MED-205-B']
        ],
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'SURG',
            'floor_number'  => '3rd Floor',
            'room_number'   => 'Room 301',
            'room_name'     => 'Post-Surgical Private 301',
            'room_type'     => 'Private',
            'daily_rate'    => 280.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Private En-Suite Bath, Smart TV, Couch, Mini-Fridge, Telemetry',
            'beds'          => ['SURG-301']
        ],
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'SURG',
            'floor_number'  => '3rd Floor',
            'room_number'   => 'Room 302',
            'room_name'     => 'Post-Surgical Private 302',
            'room_type'     => 'Private',
            'daily_rate'    => 280.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Private En-Suite Bath, Smart TV, Couch, Mini-Fridge, Telemetry',
            'beds'          => ['SURG-302']
        ],
        [
            'building_code' => 'MAIN',
            'ward_code'     => 'MAT',
            'floor_number'  => '3rd Floor',
            'room_number'   => 'Room 310',
            'room_name'     => 'Maternity Suite 310',
            'room_type'     => 'Deluxe Suite',
            'daily_rate'    => 450.00,
            'max_beds'      => 1,
            'gender_restriction' => 'Female Only',
            'amenities'     => 'Luxury Postpartum Suite, Bassinet, Partner Bed, En-Suite Jacuzzi Bath, Refrigerator, Microwave, 55" TV',
            'beds'          => ['MAT-310']
        ],

        // Building TWR-A - Floor 4 (ICU & Critical Care)
        [
            'building_code' => 'TWR-A',
            'ward_code'     => 'ICU',
            'floor_number'  => '4th Floor',
            'room_number'   => 'Room 401',
            'room_name'     => 'ICU Isolation Suite 401',
            'room_type'     => 'ICU',
            'daily_rate'    => 650.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Negative Pressure Airflow, Advanced Ventilator Station, Central Telemetry, Hemodynamic Monitoring, Dialysis Hookup',
            'beds'          => ['ICU-01']
        ],
        [
            'building_code' => 'TWR-A',
            'ward_code'     => 'ICU',
            'floor_number'  => '4th Floor',
            'room_number'   => 'Room 402',
            'room_name'     => 'ICU Critical Bay 402',
            'room_type'     => 'ICU',
            'daily_rate'    => 650.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Central Telemetry, Multi-parameter Monitor, Syringe Infusion Array, Crash Cart Access',
            'beds'          => ['ICU-02']
        ],
        [
            'building_code' => 'TWR-A',
            'ward_code'     => 'ICU',
            'floor_number'  => '4th Floor',
            'room_number'   => 'Room 403',
            'room_name'     => 'ICU Critical Bay 403',
            'room_type'     => 'ICU',
            'daily_rate'    => 650.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Central Telemetry, Ventilator, Hemodynamic Monitor, CRRT Port',
            'beds'          => ['ICU-03']
        ],
        [
            'building_code' => 'TWR-A',
            'ward_code'     => 'ISOL',
            'floor_number'  => '5th Floor',
            'room_number'   => 'Room 501',
            'room_name'     => 'Airborne Isolation 501',
            'room_type'     => 'Isolation',
            'daily_rate'    => 400.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Negative Air Pressure Anteroom, HEPA Filtration, Hands-Free Sink, Dedicated Exhaust',
            'beds'          => ['ISOL-501']
        ],

        // Building WEST - Floor 1 & 2 (Pediatrics & VIP Deluxe)
        [
            'building_code' => 'WEST',
            'ward_code'     => 'PEDI',
            'floor_number'  => '1st Floor',
            'room_number'   => 'Room 101-P',
            'room_name'     => 'Pediatric Semi-Private 101',
            'room_type'     => 'Semi-Private',
            'daily_rate'    => 160.00,
            'max_beds'      => 2,
            'gender_restriction' => 'Pediatric',
            'amenities'     => 'Pediatric Crib / Youth Bed, Parent Sleeper Chair, Colorful Decor, Cable TV',
            'beds'          => ['PED-101-A', 'PED-101-B']
        ],
        [
            'building_code' => 'WEST',
            'ward_code'     => null,
            'floor_number'  => '2nd Floor',
            'room_number'   => 'Suite 201',
            'room_name'     => 'Presidential VIP Suite 201',
            'room_type'     => 'Deluxe Suite',
            'daily_rate'    => 750.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Master Bedroom, Separate Living Room, 2 Bathrooms, Kitchenette, Butler Service, Concierge Nurse Station',
            'beds'          => ['VIP-201']
        ],

        // Building ER-BLDG - Ground Floor (Emergency Bays)
        [
            'building_code' => 'ER-BLDG',
            'ward_code'     => null,
            'floor_number'  => 'Ground Floor',
            'room_number'   => 'Bay 01',
            'room_name'     => 'Trauma Resuscitation Bay 1',
            'room_type'     => 'Emergency Bay',
            'daily_rate'    => 200.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Overhead Trauma Light, Defibrillator, Rapid Infuser, Suction, O2 Wall Outlet',
            'beds'          => ['ER-BAY-01']
        ],
        [
            'building_code' => 'ER-BLDG',
            'ward_code'     => null,
            'floor_number'  => 'Ground Floor',
            'room_number'   => 'Bay 02',
            'room_name'     => 'Emergency Acute Bay 2',
            'room_type'     => 'Emergency Bay',
            'daily_rate'    => 120.00,
            'max_beds'      => 1,
            'gender_restriction' => 'All',
            'amenities'     => 'Cardiac Monitor, Portable Ultrasound Access, Vital Signs Cart',
            'beds'          => ['ER-BAY-02']
        ]
    ];

    $insertRoomStmt = $db->prepare("
        INSERT INTO hospital_rooms (
            building_id, ward_id, floor_number, room_number, room_name,
            room_type, daily_rate, max_beds, gender_restriction, status, amenities, is_active
        ) VALUES (
            :building_id, :ward_id, :floor_number, :room_number, :room_name,
            :room_type, :daily_rate, :max_beds, :gender_restriction, 'Available', :amenities, 1
        )
    ");

    $insertBedStmt = $db->prepare("
        INSERT INTO hospital_beds (
            room_id, ward_id, bed_number, room_number, bed_type, status, features, is_active, daily_rate
        ) VALUES (
            :room_id, :ward_id, :bed_number, :room_number, :bed_type, 'Available', :features, 1, :daily_rate
        )
        ON DUPLICATE KEY UPDATE
            room_id = VALUES(room_id),
            daily_rate = VALUES(daily_rate)
    ");

    foreach ($rooms as $r) {
        $buildingId = $wardMap[$r['building_code']] ?? null;
        // Lookup building by code
        $bId = $db->query("SELECT id FROM hospital_buildings WHERE building_code = " . $db->quote($r['building_code']))->fetchColumn();
        if (!$bId) continue;

        $wardId = null;
        if (!empty($r['ward_code'])) {
            $wId = $db->query("SELECT id FROM hospital_wards WHERE ward_code = " . $db->quote($r['ward_code']))->fetchColumn();
            if ($wId) $wardId = (int)$wId;
        }

        $insertRoomStmt->execute([
            ':building_id'        => $bId,
            ':ward_id'            => $wardId,
            ':floor_number'       => $r['floor_number'],
            ':room_number'        => $r['room_number'],
            ':room_name'          => $r['room_name'],
            ':room_type'          => $r['room_type'],
            ':daily_rate'         => $r['daily_rate'],
            ':max_beds'           => $r['max_beds'],
            ':gender_restriction' => $r['gender_restriction'],
            ':amenities'          => $r['amenities']
        ]);
        $roomId = (int)$db->lastInsertId();

        // Register default beds for this room
        foreach ($r['beds'] as $bedNum) {
            $bedType = 'Standard Acute Bed';
            if ($r['room_type'] === 'ICU') $bedType = 'ICU Monitor Bed';
            else if ($r['room_type'] === 'Isolation') $bedType = 'Negative Pressure Isolation';
            else if ($r['room_type'] === 'Semi-Private') $bedType = 'Stepdown Bed';

            $insertBedStmt->execute([
                ':room_id'     => $roomId,
                ':ward_id'     => $wardId ?: 1,
                ':bed_number'  => $bedNum,
                ':room_number' => $r['room_number'],
                ':bed_type'    => $bedType,
                ':features'    => $r['amenities'],
                ':daily_rate'  => $r['daily_rate']
            ]);
        }
    }
    echo "[OK] Seeded " . count($rooms) . " hospital rooms with beds.\n";
}

// 6. Link any pre-existing unlinked beds by matching room_number
$db->exec("
    UPDATE hospital_beds b
    JOIN hospital_rooms r ON b.room_number = r.room_number
    SET b.room_id = r.id
    WHERE b.room_id IS NULL
");
echo "[OK] Mapped existing beds to corresponding rooms.\n";

// 7. Update Room statuses based on their beds
$db->exec("
    UPDATE hospital_rooms r
    SET status = CASE
        WHEN (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id AND b.status = 'Occupied') >= r.max_beds THEN 'Occupied'
        WHEN (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id AND b.status = 'Occupied') > 0 THEN 'Partially Occupied'
        WHEN (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id AND b.status = 'Dirty / Turnover') > 0 THEN 'Dirty / Turnover'
        WHEN (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id AND b.status = 'Maintenance') = (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id) AND (SELECT COUNT(*) FROM hospital_beds b WHERE b.room_id = r.id) > 0 THEN 'Maintenance'
        ELSE 'Available'
    END
");
echo "[OK] Synchronized all room statuses with current bed states.\n";

echo "=== MIGRATION & SEED COMPLETE ===\n";
