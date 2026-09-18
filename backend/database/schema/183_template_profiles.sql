-- =============================================
-- Table: template_profiles
-- A named, reusable preset combining a Category and a Group -- the
-- "Profiles" button on the Template Maintenance screen. Loading a
-- profile fills in the Category picker and preselects that group's
-- templates in one click, instead of picking both by hand every time.
-- =============================================

CREATE TABLE IF NOT EXISTS template_profiles (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(150) NOT NULL,

    category_id INT NULL,

    template_group_id INT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_template_profiles_name
        UNIQUE (name),

    INDEX idx_template_profiles_category (category_id),

    INDEX idx_template_profiles_group (template_group_id),

    INDEX idx_template_profiles_created_by (created_by),

    INDEX idx_template_profiles_updated_by (updated_by),

    INDEX idx_template_profiles_deleted_by (deleted_by),

    CONSTRAINT fk_template_profiles_category
        FOREIGN KEY (category_id)
        REFERENCES template_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_template_profiles_group
        FOREIGN KEY (template_group_id)
        REFERENCES template_groups(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
