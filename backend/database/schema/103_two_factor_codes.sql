-- =============================================
-- Table: two_factor_codes
-- One-time verification codes issued during the login flow when
-- Two-Factor Authentication is enabled for the logging-in user's role
-- (see general_settings / general_settings_two_factor_roles). A row is
-- created after the password check succeeds and consumed once the code
-- is verified; `attempts` caps brute-force guessing of a single code.
-- =============================================

CREATE TABLE IF NOT EXISTS two_factor_codes (

    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    code VARCHAR(10) NOT NULL,

    method VARCHAR(20) NOT NULL,

    expires_at DATETIME NOT NULL,

    consumed_at DATETIME NULL,

    attempts INT NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_two_factor_codes_user (user_id),

    CONSTRAINT fk_two_factor_codes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
