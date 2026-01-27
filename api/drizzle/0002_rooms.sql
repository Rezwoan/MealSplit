CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  owner_user_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_memberships (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  status ENUM('pending','active','rejected','left') NOT NULL DEFAULT 'pending',
  inviter_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  invitee_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  joined_at DATETIME NULL,
  left_at DATETIME NULL,
  CONSTRAINT fk_room_memberships_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT room_memberships_room_user_unique UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_invites (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  code VARCHAR(32) NOT NULL UNIQUE,
  inviter_user_id VARCHAR(36) NOT NULL,
  invitee_email VARCHAR(255) NULL,
  status ENUM('active','revoked','expired','accepted') NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_room_invites_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_invites_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
);
