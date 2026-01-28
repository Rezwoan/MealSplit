# Room Members & Settings Testing Guide

## Overview
This guide covers testing for room member management, 4-person capacity limits, member roles (owner/admin/member), and roommate accent colors.

## Prerequisites
- Backend running on port 3001
- Frontend running on port 5173
- Migration 0008 applied to database
- At least one user account with JWT token

## API Endpoints

### 1. GET /rooms/:roomId
Returns room details and members with accent hues.

**PowerShell-safe curl:**
```powershell
$token = "your_jwt_token_here"
$roomId = "your_room_id_here"

curl -X GET "http://localhost:3001/rooms/$roomId" `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "room": {
    "id": "room-uuid",
    "name": "My Room",
    "currency": "USD",
    "ownerUserId": "user-uuid",
    "createdAt": "2026-01-28T..."
  },
  "members": [
    {
      "id": "membership-uuid",
      "userId": "user-uuid",
      "displayName": "Alice",
      "email": "alice@example.com",
      "role": "owner",
      "status": "active",
      "inviterConfirmed": 1,
      "inviteeConfirmed": 1,
      "accentHue": 190,
      "themeMode": "dark"
    }
  ]
}
```

### 2. POST /rooms/:roomId/invites
Create an invite code (admin/owner only).

**PowerShell-safe curl:**
```powershell
$token = "your_jwt_token_here"
$roomId = "your_room_id_here"

curl -X POST "http://localhost:3001/rooms/$roomId/invites" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{}'
```

**Expected Response:**
```json
{
  "invite": {
    "code": "base64url-code",
    "expiresAt": null
  }
}
```

### 3. POST /invites/:code/accept
Accept an invite (creates pending membership).

**PowerShell-safe curl:**
```powershell
$token = "invitee_jwt_token"
$code = "invite_code_from_previous_step"

curl -X POST "http://localhost:3001/invites/$code/accept" `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "roomId": "room-uuid",
  "membershipStatus": "pending"
}
```

**Error when room is full (4 active members):**
```json
{
  "message": "Room is full"
}
```

### 4. POST /rooms/:roomId/members/:memberId/confirm
Confirm a pending membership (inviter or invitee side).

**Inviter confirms (admin/owner):**
```powershell
$token = "admin_jwt_token"
$roomId = "your_room_id_here"
$memberId = "membership_id"

curl -X POST "http://localhost:3001/rooms/$roomId/members/$memberId/confirm" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"side":"inviter","confirm":true}'
```

**Invitee confirms (the invited user):**
```powershell
$token = "invitee_jwt_token"
$roomId = "your_room_id_here"
$memberId = "membership_id"

curl -X POST "http://localhost:3001/rooms/$roomId/members/$memberId/confirm" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"side":"invitee","confirm":true}'
```

**Expected Response:**
```json
{
  "membership": {
    "id": "membership-uuid",
    "roomId": "room-uuid",
    "userId": "user-uuid",
    "role": "member",
    "status": "pending",
    "inviterConfirmed": 1,
    "inviteeConfirmed": 0,
    "joinedAt": null,
    "leftAt": null
  }
}
```

**After both confirm, status becomes 'active':**
```json
{
  "membership": {
    "status": "active",
    "joinedAt": "2026-01-28T..."
  }
}
```

**Error when room reaches 4 active members during confirmation:**
```json
{
  "message": "Room is full (max 4 active members)."
}
```

### 5. POST /rooms/:roomId/members/:memberId/reject
Reject a pending membership (admin/owner only).

**PowerShell-safe curl:**
```powershell
$token = "admin_jwt_token"
$roomId = "your_room_id_here"
$memberId = "membership_id"

curl -X POST "http://localhost:3001/rooms/$roomId/members/$memberId/reject" `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "membership": {
    "id": "membership-uuid",
    "status": "rejected",
    ...
  }
}
```

### 6. DELETE /rooms/:roomId/members/:memberId
Remove a member from the room (admin/owner only, cannot remove owner).

**PowerShell-safe curl:**
```powershell
$token = "admin_jwt_token"
$roomId = "your_room_id_here"
$memberId = "membership_id"

curl -X DELETE "http://localhost:3001/rooms/$roomId/members/$memberId" `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "ok": true
}
```

**Error when trying to remove owner:**
```json
{
  "message": "Cannot remove owner without transferring ownership"
}
```

### 7. PATCH /rooms/:roomId/members/:memberId/role
Change a member's role (owner only, can set admin or member).

**PowerShell-safe curl:**
```powershell
$token = "owner_jwt_token"
$roomId = "your_room_id_here"
$memberId = "membership_id"

curl -X PATCH "http://localhost:3001/rooms/$roomId/members/$memberId/role" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"role":"admin"}'
```

**Expected Response:**
```json
{
  "membership": {
    "id": "membership-uuid",
    "role": "admin",
    ...
  }
}
```

**Error when non-owner tries:**
```json
{
  "message": "Only owner can change roles"
}
```

### 8. POST /rooms/:roomId/leave
Leave a room (any member except sole owner).

**PowerShell-safe curl:**
```powershell
$token = "member_jwt_token"
$roomId = "your_room_id_here"

curl -X POST "http://localhost:3001/rooms/$roomId/leave" `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "ok": true
}
```

**Error when owner tries to leave:**
```json
{
  "message": "Owner cannot leave without transferring ownership"
}
```

## Testing Scenarios

### Scenario 1: Room Full (4-Person Cap)
Test that the 4-member limit is enforced.

**Steps:**
1. Create a room (you become owner, 1/4 members)
2. Create 3 invite codes
3. Have 3 different users accept invites
4. Confirm all 3 as inviter (admin)
5. Have all 3 confirm as invitee
6. Room now has 4 active members
7. Create a 5th invite code
8. Have a 5th user try to accept invite
9. **Expected:** 400 "Room is full" error

**Alternate test:**
1. Room has 3 active members
2. Create 2 invite codes
3. Both users accept (2 pending)
4. Confirm one user completely (now 4 active)
5. Try to confirm the second user
6. **Expected:** 409 "Room is full (max 4 active members)." error

### Scenario 2: Pending Member Confirmation
Test the two-sided confirmation flow.

**Steps:**
1. Admin creates invite code
2. User B accepts invite → status='pending', inviterConfirmed=0, inviteeConfirmed=0
3. GET /rooms/:roomId → shows member with status 'pending'
4. Frontend shows "Waiting for both confirmations"
5. Admin confirms (POST .../confirm with side=inviter) → inviterConfirmed=1
6. Frontend shows "Waiting for invitee confirmation"
7. User B confirms (POST .../confirm with side=invitee) → inviteeConfirmed=1
8. Status changes to 'active', joinedAt is set
9. Frontend shows "Active" badge

### Scenario 3: Role Management
Test owner changing member roles.

**Steps:**
1. Room has owner (you) and 2 active members
2. Owner calls PATCH .../members/:memberId/role with role='admin'
3. Member becomes admin
4. Admin can now create invites and manage pending members
5. Owner demotes admin back to 'member'
6. Ex-admin loses invite creation ability

**Error test:**
- Non-owner (admin or member) tries to change role → 403 "Only owner can change roles"
- Anyone tries to change owner's role → 400 "Cannot change owner role"

### Scenario 4: Remove Member
Test admin removing an active member.

**Steps:**
1. Room has 3 active members (1 owner, 2 members)
2. Owner calls DELETE .../members/:memberId for member A
3. Member A's status changes to 'left', leftAt is set
4. Member A loses access to room
5. Room now has 2 active members (capacity freed)

**Error test:**
- Try to remove owner → 400 "Cannot remove owner without transferring ownership"

### Scenario 5: Leave Room
Test member voluntarily leaving.

**Steps:**
1. Member B calls POST /rooms/:roomId/leave
2. Membership status='left', leftAt is set
3. Member B redirected to /rooms
4. Member B no longer sees room in list
5. Room capacity freed (e.g., 3/4 → 2/4)

**Error test:**
- Owner tries to leave → 400 "Owner cannot leave without transferring ownership"

### Scenario 6: Reject Pending Member
Test admin rejecting a pending membership.

**Steps:**
1. User C accepts invite → pending
2. Admin calls POST .../members/:memberId/reject
3. Membership status='rejected'
4. User C sees rejection (or loses access)
5. Capacity not consumed

## Frontend UI Testing

### Room Settings Page (/rooms/:roomId/settings)

**1. Room Information Card**
- [ ] Displays room name
- [ ] Displays currency
- [ ] Shows active member count (e.g., "3/4")

**2. Members Card**
- [ ] Lists all active and pending members
- [ ] Each member shows:
  - [ ] Accent color dot (from accentHue)
  - [ ] Display name
  - [ ] Email
  - [ ] Role badge (Owner/Admin/Member)
  - [ ] Status badge (Active/Pending)
- [ ] Pending members show waiting text:
  - [ ] "Waiting for both confirmations" (neither confirmed)
  - [ ] "Waiting for inviter confirmation" (invitee confirmed only)
  - [ ] "Waiting for invitee confirmation" (inviter confirmed only)

**3. Admin Actions (visible to owner/admin)**
- [ ] Approve button for pending members (if inviterConfirmed=0)
- [ ] Reject button for pending members
- [ ] Remove button for active members (except owner)
- [ ] Actions hidden for non-admins

**4. Owner Actions (visible to owner only)**
- [ ] Role dropdown for active members (except self and other owners)
- [ ] Can change between Admin/Member
- [ ] Changes apply immediately

**5. Invitee Actions**
- [ ] Pending member sees "Confirm" button if inviteeConfirmed=0
- [ ] Clicking confirm updates status
- [ ] Confirmation status updates in real-time

**6. Invites Card (admin/owner only)**
- [ ] "Create Invite Code" button enabled when room not full
- [ ] Button disabled when 4 active members
- [ ] Shows "Room is full" message when at capacity
- [ ] Generated invite link displayed in read-only input
- [ ] Copy button copies link to clipboard
- [ ] Copy button shows "Copied!" feedback

**7. Danger Zone (non-owners only)**
- [ ] "Leave Room" button visible to non-owners
- [ ] Confirmation prompt before leaving
- [ ] Redirects to /rooms after leaving
- [ ] Not visible to owner

**8. Error Display**
- [ ] Error banner shows at top when API call fails
- [ ] Clear error message displayed
- [ ] Errors auto-dismiss after actions

**9. Accent Colors**
- [ ] Each member's dot uses their accentHue
- [ ] Colors are distinct and visible
- [ ] Default hue (190) used when null

**10. Responsive Layout**
- [ ] Cards stack properly on mobile
- [ ] Buttons remain accessible
- [ ] Member rows wrap gracefully

## Database Verification

After running migration 0008, verify the backfill worked:

```sql
-- Check that active members in rooms have owner role assigned
SELECT 
  r.name as room_name,
  rm.userId,
  u.displayName,
  rm.role,
  rm.status
FROM rooms r
INNER JOIN room_memberships rm ON rm.roomId = r.id
INNER JOIN users u ON u.id = rm.userId
WHERE rm.status = 'active'
ORDER BY r.name, rm.role DESC;
```

**Expected:** Each room should have at least one member with role='owner'.

## Troubleshooting

**Issue:** Room shows 0 members after migration
- **Fix:** Run GET /rooms/:roomId to verify member data
- **Check:** Migration 0008 ran successfully
- **Verify:** room_memberships table has role column

**Issue:** Cannot create invite when room has 3 members
- **Fix:** Check activeCount query in invites.ts
- **Verify:** Status='active' members counted correctly
- **Check:** No members stuck in 'pending' status

**Issue:** Accent colors not showing
- **Fix:** Verify user_preferences table exists (migration 0007)
- **Check:** GET /rooms/:roomId includes accentHue in response
- **Verify:** leftJoin on userPreferences in rooms.ts

**Issue:** Owner cannot change roles
- **Fix:** Verify requireRoomMember returns membership with role
- **Check:** PATCH endpoint checks role === 'owner'
- **Test:** Try with fresh JWT token

**Issue:** 409 error on confirmation but room not full
- **Fix:** Check countActiveMembers excludes pending/left/rejected
- **Verify:** Status transitions happen atomically
- **Check:** Database constraint on status field

## Success Criteria

✅ All 8 API endpoints return correct responses  
✅ Room enforces 4-member cap at invite accept and confirmation  
✅ Pending members show clear waiting states in UI  
✅ Owner can change roles, admin can manage members  
✅ Members can leave, admin can remove members  
✅ Accent colors display for all members  
✅ Room full disables invite creation  
✅ Error messages are clear and actionable  
✅ Migration 0008 backfills owner roles correctly  

## Assumptions

1. **Role hierarchy:** Owner > Admin > Member  
2. **Owner transfer:** Not implemented in this slice (future work)  
3. **Max capacity:** Hardcoded to 4, no per-room override  
4. **Rejection behavior:** Sets status='rejected', does not delete row  
5. **Leave behavior:** Sets status='left', preserves historical data
