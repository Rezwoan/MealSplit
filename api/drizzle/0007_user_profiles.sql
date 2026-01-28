-- Migration #7: User Profiles + Stats + Theming
-- Adds user preferences (theme, accent color) and profile fields (bio, avatar)

-- Extend users table with profile fields
ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500) NULL AFTER email,
ADD COLUMN bio VARCHAR(280) NULL AFTER avatar_url;

-- Create user_preferences table for theme and personalization
CREATE TABLE user_preferences (
  user_id VARCHAR(36) PRIMARY KEY,
  theme_mode ENUM('light', 'dark', 'amoled') NOT NULL DEFAULT 'dark',
  accent_hue INT NOT NULL DEFAULT 190 COMMENT 'HSL hue value 0-360 for accent color',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (accent_hue >= 0 AND accent_hue <= 360)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default preferences for existing users
INSERT INTO user_preferences (user_id, theme_mode, accent_hue)
SELECT id, 'dark', 190 FROM users
ON DUPLICATE KEY UPDATE user_id = user_id;
