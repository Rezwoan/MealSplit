# Room Settings + Member Management Implementation Summary

## Overview
Implemented comprehensive room member management with role-based permissions, 4-person capacity enforcement, and roommate accent color display.

## Completed Features

### 1. Database (Migration 0008)
- ✅ Backfills `role` column (already existed) for existing rooms
- ✅ Sets earliest active member as 'owner' if no owner exists
- ✅ Preserves all existing membership data

### 2. API Endpoints (8 total)

#### Room Details
- **GET /rooms/:roomId** - Extended to include member accent hues and theme modes

#### Member Management
- **POST /rooms/:roomId/members/:memberId/confirm** - Improved with 4-member cap check
- **POST /rooms/:roomId/members/:memberId/reject** - NEW - Reject pending membership
- **DELETE /rooms/:roomId/members/:memberId** - NEW - Remove member (admin/owner only)
- **PATCH /rooms/:roomId/members/:memberId/role** - NEW - Change role (owner only)
- **POST /rooms/:roomId/leave** - Enhanced with ownership validation

#### Invites
- **POST /rooms/:roomId/invites** - Existing, works with capacity checks
- **POST /invites/:code/accept** - Enhanced with room-full validation

### 3. Frontend Components

#### RoomSettings.tsx (NEW)
- **Room Information Card**: Name, currency, active member count (X/4)
- **Members Card**: 
  - Lists all active/pending members
  - Shows accent color dot for each member (from user_preferences)
  - Displays role badges (Owner/Admin/Member)
  - Shows status badges (Active/Pending)
  - Clear pending state messages ("Waiting for inviter confirmation", etc.)
  - Conditional action buttons based on user role:
    - Admin: Approve/reject pending, remove active members
    - Owner: Change member roles (Admin/Member dropdown)
    - Invitee: Confirm own membership
- **Invites Card** (admin/owner only):
  - Create invite code button
  - Disabled when room full (4 active members)
  - Copy invite link functionality
- **Danger Zone** (non-owners):
  - Leave room button with confirmation

#### RoomTabs Component
- ✅ Added "Settings" tab with Settings icon

#### App.tsx
- ✅ Added `/rooms/:roomId/settings` route

### 4. Business Logic

#### 4-Person Capacity Enforcement
- **On invite accept**: Returns 400 "Room is full" if 4 active members
- **On confirmation**: Returns 409 "Room is full (max 4 active members)." if trying to activate 5th member
- **Invite creation**: Frontend disables button and shows message when full

#### Role Permissions
- **Owner**: Can change roles, remove members, create invites, manage pending
- **Admin**: Can remove members (except owner), create invites, manage pending
- **Member**: Can confirm own membership, leave room

#### Membership States
- **Pending**: Requires both inviter and invitee confirmation
- **Active**: Fully confirmed, counts toward capacity
- **Rejected**: Inviter/admin or invitee rejected
- **Left**: Member left voluntarily or was removed

### 5. Documentation
- ✅ Updated **DB_SETUP.md** with migration 0008 import step
- ✅ Created **ROOM_MEMBERS_TESTING.md** with:
  - 8 curl examples (PowerShell-safe)
  - 6 testing scenarios (room full, pending confirmation, role management, etc.)
  - 10 frontend UI test checklists
  - Database verification queries
  - Troubleshooting guide
  - Success criteria and assumptions

## File Changes

### Backend (API)
- `api/drizzle/0008_room_settings.sql` - NEW (backfill migration)
- `api/src/routes/rooms.ts` - MODIFIED (added accent hues, 3 new endpoints)
- `api/src/routes/invites.ts` - MODIFIED (added reject endpoint, 4-member cap)
- `api/src/db/schema.ts` - NO CHANGE (role enum already existed)

### Frontend (Web)
- `web/src/pages/RoomSettings.tsx` - NEW (full settings page, 385 lines)
- `web/src/components/RoomTabs.tsx` - MODIFIED (added Settings tab)
- `web/src/App.tsx` - MODIFIED (added settings route)

### Documentation
- `docs/DB_SETUP.md` - MODIFIED (added migration 0008)
- `docs/ROOM_MEMBERS_TESTING.md` - NEW (comprehensive testing guide)

## Technical Details

### Accent Color Rendering
```tsx
const hueToHsl = (hue: number | null): string => {
  if (hue === null) return 'hsl(190, 70%, 50%)'
  return `hsl(${hue}, 70%, 50%)`
}

// Usage
<div
  className="h-10 w-10 rounded-full"
  style={{ backgroundColor: hueToHsl(member.accentHue) }}
/>
```

### Capacity Check (API)
```typescript
const activeCount = await countActiveMembers(roomId)
if (activeCount >= 4) {
  return reply.code(409).send({ message: 'Room is full (max 4 active members).' })
}
```

### Role Validation
```typescript
const requesterMembership = await requireRoomMember(roomId, userId)
if (!requesterMembership || requesterMembership.role !== 'owner') {
  return reply.code(403).send({ message: 'Only owner can change roles' })
}
```

## Testing Commands

### Apply Migration
```bash
mysql -u root mealsplit < api/drizzle/0008_room_settings.sql
```

### Test API (PowerShell)
```powershell
# Get room with members
$token = "your_jwt_token"
$roomId = "room_id"
curl -X GET "http://localhost:3001/rooms/$roomId" `
  -H "Authorization: Bearer $token"

# Change member role
curl -X PATCH "http://localhost:3001/rooms/$roomId/members/$memberId/role" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"role":"admin"}'
```

### Frontend Testing
1. Navigate to http://localhost:5173/
2. Login and select a room
3. Click "Settings" tab
4. Test member management features
5. Verify accent colors display correctly

## Success Criteria

✅ Room enforces 4-person capacity limit  
✅ Pending confirmations show clear UI states  
✅ Members display with accent color dots  
✅ Owner can manage roles (Admin/Member)  
✅ Admin can approve/reject/remove members  
✅ Any member can leave (except sole owner)  
✅ Room full disables invite creation  
✅ All API endpoints return correct responses  
✅ TypeScript compiles without errors  
✅ Documentation complete with curl examples  

## Assumptions

1. **Max capacity**: Hardcoded to 4 members, no per-room override
2. **Owner transfer**: Not implemented (owner cannot leave if sole owner)
3. **Multiple owners**: Theoretically supported but UI assumes single owner
4. **Rejection behavior**: Sets status='rejected', preserves row for audit
5. **Leave behavior**: Sets status='left', preserves historical data

## Future Enhancements

- Owner transfer functionality
- Configurable room capacity per room
- Batch member operations (approve all pending)
- Member activity history (joined date, last active)
- Member search/filter in large rooms
- Export member list

## Known Limitations

- Owner cannot leave without transferring ownership (blocked by API)
- Cannot promote members to owner (requires transfer flow)
- Rejected members cannot re-join without new invite
- Accent colors not customizable per-room (global user preference)
- No notification system for pending confirmations

## Deployment Checklist

- [ ] Apply migration 0008 to production database
- [ ] Verify existing rooms have owner roles assigned
- [ ] Deploy API changes (restart backend)
- [ ] Build and deploy frontend (npm run build)
- [ ] Test in production with real users
- [ ] Monitor for capacity enforcement errors
- [ ] Verify accent colors display correctly
- [ ] Update any external documentation

## Related Documentation

- [DB_SETUP.md](DB_SETUP.md) - Database setup and migrations
- [ROOM_MEMBERS_TESTING.md](ROOM_MEMBERS_TESTING.md) - Comprehensive testing guide
- [USER_PROFILES_GUIDE.md](USER_PROFILES_GUIDE.md) - User preferences and accent colors
