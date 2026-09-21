-- =============================================
-- Password Expiration & History Restriction (HIPAA § 164.308(a)(5)(ii)(D))
-- =============================================

ALTER TABLE users
ADD COLUMN password_changed_at DATETIME NULL AFTER is_locked;

CREATE TABLE IF NOT EXISTS user_password_history (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_uph_user_id (user_id),
    CONSTRAINT fk_uph_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Initialize existing users
UPDATE users 
SET password_changed_at = COALESCE(created_at, NOW()) 
WHERE password_changed_at IS NULL;

INSERT INTO user_password_history (user_id, password_hash, created_at)
SELECT u.id, u.password, COALESCE(u.password_changed_at, NOW())
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_password_history uph WHERE uph.user_id = u.id
);
