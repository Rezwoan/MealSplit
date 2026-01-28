# Room Settings Quick Reference

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rooms/:roomId` | Member | Get room details + members with accent hues |
| POST | `/rooms/:roomId/invites` | Admin | Create invite code |
| POST | `/invites/:code/accept` | Any | Accept invite (checks capacity) |
| POST | `/rooms/:roomId/members/:memberId/confirm` | Admin/Invitee | Confirm membership (checks capacity at activation) |
| POST | `/rooms/:roomId/members/:memberId/reject` | Admin/Invitee | Reject pending membership |
| DELETE | `/rooms/:roomId/members/:memberId` | Admin | Remove member (not owner) |
| PATCH | `/rooms/:roomId/members/:memberId/role` | Owner | Change role (admin/member) |
| POST | `/rooms/:roomId/leave` | Member | Leave room (not sole owner) |

## Capacity Enforcement

| Point | HTTP Code | Message |
|-------|-----------|---------|
| Invite accept | 400 | "Room is full" |
| Confirmation | 409 | "Room is full (max 4 active members)." |

## Role Permissions

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Create invites | ✅ | ✅ | ❌ |
| Approve pending | ✅ | ✅ | ❌ |
| Reject pending | ✅ | ✅ | ❌ |
| Remove member | ✅ | ✅ (not owner) | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Confirm own membership | ✅ | ✅ | ✅ |
| Leave room | ❌ (if sole owner) | ✅ | ✅ |

## Pending States

| inviterConfirmed | inviteeConfirmed | UI Message |
|------------------|------------------|------------|
| 0 | 0 | "Waiting for both confirmations" |
| 0 | 1 | "Waiting for inviter confirmation" |
| 1 | 0 | "Waiting for invitee confirmation" |
| 1 | 1 | Status becomes 'active' |

## Testing Scenarios

### 1. Room Full Test
```powershell
# 1. Create room (1/4)
# 2. Invite + confirm 3 users (4/4)
# 3. Try 5th invite accept → 400 "Room is full"
```

### 2. Pending Confirmation Test
```powershell
# 1. Admin creates invite
# 2. User accepts → pending
# 3. Admin confirms → inviterConfirmed=1
# 4. User confirms → status='active'
```

### 3. Role Management Test
```powershell
# Owner changes member to admin
curl -X PATCH "http://localhost:3001/rooms/$roomId/members/$memberId/role" `
  -H "Authorization: Bearer $ownerToken" `
  -H "Content-Type: application/json" `
  -d '{"role":"admin"}'
```

### 4. Remove Member Test
```powershell
# Admin removes member
curl -X DELETE "http://localhost:3001/rooms/$roomId/members/$memberId" `
  -H "Authorization: Bearer $adminToken"
```

## Database Import

```bash
mysql -u root mealsplit < api/drizzle/0008_room_settings.sql
```

## Accent Color Helper

```tsx
const hueToHsl = (hue: number | null): string => {
  if (hue === null) return 'hsl(190, 70%, 50%)'
  return `hsl(${hue}, 70%, 50%)`
}
```

## Common Error Codes

| Code | Scenario | Message |
|------|----------|---------|
| 400 | Room full (accept) | "Room is full" |
| 400 | Owner tries to leave | "Owner cannot leave without transferring ownership" |
| 400 | Try to remove owner | "Cannot remove owner without transferring ownership" |
| 400 | Try to change owner role | "Cannot change owner role" |
| 403 | Non-admin manages members | "Not allowed" |
| 403 | Non-owner changes roles | "Only owner can change roles" |
| 404 | Member not found | "Membership not found" |
| 409 | Room full (confirmation) | "Room is full (max 4 active members)." |

## Frontend Routes

- `/rooms/:roomId/settings` - Room settings page
- Shows: Room info, member list, invite creation, leave button

## Success Verification

```sql
-- Check owner roles assigned
SELECT r.name, COUNT(*) as owner_count
FROM rooms r
INNER JOIN room_memberships rm ON rm.roomId = r.id
WHERE rm.role = 'owner' AND rm.status = 'active'
GROUP BY r.id, r.name;

-- Check room capacities
SELECT r.name, COUNT(*) as active_members
FROM rooms r
INNER JOIN room_memberships rm ON rm.roomId = r.id
WHERE rm.status = 'active'
GROUP BY r.id, r.name
HAVING COUNT(*) > 4;
-- Should return no rows
```

## Key Files Modified

- `api/drizzle/0008_room_settings.sql` - Migration
- `api/src/routes/rooms.ts` - Added 3 endpoints, extended GET
- `api/src/routes/invites.ts` - Added reject, capacity checks
- `web/src/pages/RoomSettings.tsx` - NEW settings page
- `web/src/components/RoomTabs.tsx` - Added Settings tab
- `web/src/App.tsx` - Added settings route
- `docs/ROOM_MEMBERS_TESTING.md` - Full testing guide
- `docs/DB_SETUP.md` - Updated import steps
