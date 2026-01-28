-- Migration 0008: Room Settings (backfill owner roles)
-- Ensures each room has at least one owner

-- Backfill owner role for existing rooms
-- Set the earliest active member as owner if no owner exists
UPDATE room_memberships rm
INNER JOIN (
    SELECT 
        rm2.roomId,
        MIN(rm2.id) as earliest_member_id
    FROM room_memberships rm2
    WHERE rm2.status = 'active'
      AND NOT EXISTS (
        SELECT 1 
        FROM room_memberships rm3 
        WHERE rm3.roomId = rm2.roomId 
          AND rm3.role = 'owner'
      )
    GROUP BY rm2.roomId
) earliest ON rm.roomId = earliest.roomId AND rm.id = earliest.earliest_member_id
SET rm.role = 'owner'
WHERE rm.status = 'active';
