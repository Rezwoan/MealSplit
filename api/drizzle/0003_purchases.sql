CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  payer_user_id VARCHAR(36) NOT NULL,
  total_amount_cents INT NOT NULL,
  currency VARCHAR(10) NOT NULL,
  notes VARCHAR(500) NULL,
  category VARCHAR(50) NULL,
  purchased_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchases_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_payer FOREIGN KEY (payer_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_splits (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  purchase_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  share_amount_cents INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_splits_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_splits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT purchase_splits_purchase_user_unique UNIQUE (purchase_id, user_id)
);

CREATE TABLE IF NOT EXISTS member_break_periods (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  mode ENUM('exclude') NOT NULL DEFAULT 'exclude',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_break_periods_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_break_periods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  payer_user_id VARCHAR(36) NOT NULL,
  receiver_user_id VARCHAR(36) NOT NULL,
  amount_cents INT NOT NULL,
  settled_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_settlements_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_settlements_payer FOREIGN KEY (payer_user_id) REFERENCES users(id),
  CONSTRAINT fk_settlements_receiver FOREIGN KEY (receiver_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_room_id ON purchases (room_id);
CREATE INDEX IF NOT EXISTS idx_purchase_splits_purchase_id ON purchase_splits (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_splits_user_id ON purchase_splits (user_id);
CREATE INDEX IF NOT EXISTS idx_break_periods_room_user ON member_break_periods (room_id, user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_settlements_room_id ON settlements (room_id);
