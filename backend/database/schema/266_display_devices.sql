-- TV displays (module 9, Phase 1): each TV is a registered device with a display key, not a
-- person's login. The key is stored only as a SHA-256 hash; the admin sees it once (when the
-- device is added or given a new key) as part of the link to open on the TV.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS display_devices (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    kind VARCHAR(20) NOT NULL,                          -- room | nurse_station | waiting_room | or | other
    ward_id INT DEFAULT NULL,                           -- room / nurse station
    bed_id INT DEFAULT NULL,                            -- room TV: the bed it faces
    or_suite_id INT DEFAULT NULL,                       -- OR TV
    location_note VARCHAR(200) DEFAULT NULL,            -- e.g. "Main lobby, east wall"
    key_hash CHAR(64) NOT NULL,
    key_hint CHAR(4) NOT NULL,                          -- last 4 characters, to tell keys apart
    key_set_at DATETIME NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,           -- off: the TV shows a blank screen
    disabled_at DATETIME DEFAULT NULL,
    disabled_by INT DEFAULT NULL,
    refresh_seconds INT NOT NULL DEFAULT 30,
    reload_requested_at DATETIME DEFAULT NULL,          -- the TV reloads its page once it sees a newer request
    last_seen_at DATETIME DEFAULT NULL,
    last_ip VARCHAR(45) DEFAULT NULL,
    last_user_agent VARCHAR(255) DEFAULT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_display_devices_key (key_hash),
    KEY idx_display_devices_kind (kind),
    KEY idx_display_devices_ward (ward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What happened to each device (added, key changed, turned off / on, reload, removed).
CREATE TABLE IF NOT EXISTS display_device_events (
    id INT NOT NULL AUTO_INCREMENT,
    device_id INT NOT NULL,
    action VARCHAR(30) NOT NULL,
    note VARCHAR(300) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_display_device_events_device (device_id),
    CONSTRAINT fk_display_device_events_device FOREIGN KEY (device_id) REFERENCES display_devices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
