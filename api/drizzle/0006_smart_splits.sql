-- Migration #6: Smart Splits (custom split modes + split inputs)
-- Adds ability to create purchases with equal, custom amount, or custom percent splits

-- Add split_mode column to purchases table
ALTER TABLE purchases 
ADD COLUMN split_mode ENUM('equal', 'custom_amount', 'custom_percent') NOT NULL DEFAULT 'equal'
AFTER category;

-- Create purchase_split_inputs table to store user-provided split inputs
-- This preserves the original user intent for editing later
CREATE TABLE purchase_split_inputs (
  id VARCHAR(36) PRIMARY KEY,
  purchase_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  input_value INT NOT NULL COMMENT 'For custom_amount: cents. For custom_percent: basis points (e.g., 25% = 2500)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY purchase_split_inputs_purchase_user_unique (purchase_id, user_id),
  INDEX idx_purchase_split_inputs_purchase (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
