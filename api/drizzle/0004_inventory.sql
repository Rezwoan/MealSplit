-- Migration 0004: Inventory items and movements
-- Import order: 0001 -> 0002 -> 0003 -> 0004

-- Table: inventory_items
-- Room-scoped items with tracking modes (quantity or servings)
CREATE TABLE `inventory_items` (
  `id` VARCHAR(36) PRIMARY KEY,
  `room_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `tracking_mode` ENUM('quantity', 'servings') NOT NULL,
  `unit` VARCHAR(20) NULL,
  `low_stock_threshold` INT NULL,
  `expiry_date` DATE NULL,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_room_items` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: inventory_movements
-- Append-only audit log for all inventory changes
CREATE TABLE `inventory_movements` (
  `id` VARCHAR(36) PRIMARY KEY,
  `room_id` VARCHAR(36) NOT NULL,
  `item_id` VARCHAR(36) NOT NULL,
  `type` ENUM('in', 'out') NOT NULL,
  `reason` ENUM('purchase', 'replenish', 'eat', 'waste', 'expired') NOT NULL,
  `amount` INT NOT NULL,
  `note` VARCHAR(300) NULL,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_room_item_movements` (`room_id`, `item_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
