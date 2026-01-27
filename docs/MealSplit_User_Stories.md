# MealSplit — User Stories (with Acceptance Criteria)

**Version:** 0.1  
**Last updated:** 2026-01-27

This file is written to help engineering (and AI coding assistants) implement features in a testable way.

---

## Roles
- **User**: any authenticated person
- **Room Owner/Admin**: manages a room, invites, and settings
- **Member**: active roommate in a room
- **Pending Member**: invited but not confirmed yet

---

## Epic A — Account, login, profile

### A1 — Sign up
**As a user,** I want to create an account so I can use MealSplit on multiple devices.  
**Acceptance criteria**
- User can sign up with email + password
- Password is validated (min length, etc.)
- User is logged in after successful signup
- Errors are shown clearly (email already used, weak password)

### A2 — Sign in / sign out
**As a user,** I want to sign in and sign out securely.  
**Acceptance criteria**
- User can log in with correct credentials
- User receives an authenticated session (token/cookie)
- Sign out removes session and returns to login screen

### A3 — Reset password
**As a user,** I want to reset my password if I forget it.  
**Acceptance criteria**
- User can request password reset with email
- User can set a new password via reset flow
- Old password stops working after reset

### A4 — Edit profile
**As a user,** I want to edit my name/avatar so my roommate recognizes me.  
**Acceptance criteria**
- User can update display name
- Avatar can be set/changed (optional)
- Updates are reflected across rooms

### A5 — Set nutrition targets
**As a user,** I want to set my protein/calorie targets so I can track progress.  
**Acceptance criteria**
- User can set daily targets (protein required, calories optional)
- Targets display in stats views and dashboard

---

## Epic B — Theming & preferences

### B1 — Theme mode
**As a user,** I want to choose Light/Dark/AMOLED theme.  
**Acceptance criteria**
- Theme choice applies instantly
- Theme persists across sessions/devices

### B2 — Accent colors
**As a user,** I want my accent color and my roommates’ colors to be consistent.  
**Acceptance criteria**
- Each user has a personal accent color preference
- Each room membership has an assigned display color (or uses user’s)
- UI uses these colors in charts, labels, and activity items

---

## Epic C — Rooms, invites, and roommate confirmation

### C1 — Create a room
**As a user,** I want to create a room so I can track shared groceries with roommates.  
**Acceptance criteria**
- User can create room with name + currency
- Creator becomes room owner/admin
- Room defaults to equal split mode

### C2 — Invite a roommate
**As an admin,** I want to invite roommates with a code/link so they can join.  
**Acceptance criteria**
- Admin can generate invite code/link
- Invite has expiry (TBD duration) and can be revoked
- Invite shows pending status in the room UI

### C3 — Join via invite
**As a user,** I want to join a room using an invite code/link.  
**Acceptance criteria**
- User can enter code or open invite link
- System creates a Pending Membership for the room
- Pending member can see limited room info (or none) until confirmed

### C4 — Roommate handshake confirmation
**As both roommates,** we want to confirm we are roommates before sharing data.  
**Acceptance criteria**
- Admin confirms the invitee (Approve/Reject)
- Invitee confirms participation
- Only after both confirmations does membership become Active
- If rejected, invitee cannot access room data

### C5 — Max 4 roommates
**As an admin,** I want to limit room size so it stays roommate-focused.  
**Acceptance criteria**
- Room cannot exceed 4 active members
- Invites are blocked if room is full

### C6 — Leave room
**As a member,** I want to leave the room if I move out.  
**Acceptance criteria**
- Member can leave room
- If leaving would orphan the room (no admin), system forces admin transfer or blocks

---

## Epic D — Purchases (shopping) and receipts

### D1 — Quick Add purchase
**As a member,** I want to add a purchase in under 10 seconds.  
**Acceptance criteria**
- User can enter amount + payer + date (defaults to now)
- Purchase saved and appears in activity feed
- Balance updates accordingly

### D2 — Detailed purchase with items
**As a member,** I want to add line items (optional) for better inventory tracking.  
**Acceptance criteria**
- User can add item name, qty, unit, price (optional fields allowed)
- Saving creates purchase and (optionally) inventory IN movements

### D3 — Attach receipt/memo photo
**As a member,** I want to upload receipt photos for trust and review.  
**Acceptance criteria**
- User can upload 1+ images to a purchase
- Images display on purchase detail page
- Only room members can access images

---

## Epic E — Splitting rules, breaks, and balances

### E1 — Equal split by default
**As a room,** we want costs to split equally most of the time.  
**Acceptance criteria**
- Purchase share = total / active_member_count at purchase time
- Active members exclude “break period excluded” members

### E2 — Break period exclusion
**As a member,** I want to set a break period so I’m excluded from splitting while I’m away.  
**Acceptance criteria**
- Member can set date range with exclusion mode
- Purchases inside range do not include excluded member in split
- UI shows break period status clearly

### E3 — Custom share weights (optional in MVP; can be V1)
**As a room,** we want to adjust splits (e.g., 20/80) during certain periods.  
**Acceptance criteria**
- Admin/member can set weighted split range
- Purchases in range use weights
- Audit view explains applied rule

### E4 — Balance summary
**As a member,** I want to see who owes whom and the total.  
**Acceptance criteria**
- Balance screen shows:
  - Paid total per member
  - Owed share per member
  - Net per member
- Pairwise settlement suggestion exists:
  - “A owes B X”

### E5 — Record settlement payment (optional)
**As roommates,** we want to mark debts as paid without deleting history.  
**Acceptance criteria**
- User can record settlement transaction (payer, receiver, amount, date)
- Balance calculation includes settlements

---

## Epic F — Inventory (pantry) management

### F1 — Add inventory item
**As a member,** I want to add pantry items so we know what we have.  
**Acceptance criteria**
- Add item with name + category
- Choose tracking mode: quantity/unit or servings
- Optional low stock threshold and expiry date

### F2 — Replenish stock
**As a member,** I want to increase stock quickly when we buy more.  
**Acceptance criteria**
- “Replenish” creates an IN movement
- Inventory totals update immediately
- Works offline (queued)

### F3 — Eat/consume stock
**As a member,** I want to log eating quickly so inventory stays accurate.  
**Acceptance criteria**
- “Eat” creates an OUT movement
- Amount supports presets and custom input
- Works offline (queued)

### F4 — Waste/expire item
**As a member,** I want to log waste so predictions remain honest.  
**Acceptance criteria**
- Waste creates an OUT movement with reason
- Expired items can be filtered/viewed

### F5 — Inventory alerts
**As a member,** I want to see low stock / expiring soon lists.  
**Acceptance criteria**
- Low stock list uses threshold
- Expiring soon list uses expiry date within configurable window (e.g., 3–7 days)

---

## Epic G — Consumption logging & nutrition

### G1 — Log meal (eat event)
**As a member,** I want to log meals (who ate what) quickly.  
**Acceptance criteria**
- Select item(s), eater(s), amount, meal type, time
- Creates consumption log
- Optionally links to inventory movement

### G2 — Nutrition profiles (manual)
**As a member,** I want to set calories/protein for items so stats work.  
**Acceptance criteria**
- Set per-100g or per-serving calories and protein for an inventory item
- Stats calculations use the profile

### G3 — Daily/weekly nutrition stats
**As a member,** I want to see my protein/calories vs target.  
**Acceptance criteria**
- Today totals shown
- Weekly chart shown
- “On break” doesn’t break stats; it just results in fewer logs

---

## Epic H — Dashboard and analytics

### H1 — Today card
**As a member,** I want a single “Today” view so I instantly know the situation.  
**Acceptance criteria**
- Shows today spend
- Shows today protein/calories per user
- Shows top item running out (based on heuristic)

### H2 — Spending charts
**As a member,** I want to see spending trends so I understand habits.  
**Acceptance criteria**
- Charts for weekly/monthly spend
- Category breakdown

### H3 — Runway estimate (heuristic)
**As a member,** I want to know “days left” for key items.  
**Acceptance criteria**
- Calculates average daily usage from movement/consumption history
- Displays days left for items with enough data
- Shows “insufficient data” when history is missing

---

## Epic I — Offline-first & sync

### I1 — Offline usage
**As a member,** I want the app to work without internet.  
**Acceptance criteria**
- Inventory view loads offline (cached)
- Eat/replenish can be performed offline (queued)
- Draft purchases can be created offline

### I2 — Sync queue
**As the system,** I want to sync offline actions safely when online returns.  
**Acceptance criteria**
- Queued actions are replayed in order
- Failures show a retry UI
- Conflicts are minimized by using append-only logs (movements/purchases)

---

## Epic J — Admin, safety, and data quality

### J1 — Remove member (admin)
**As an admin,** I want to remove a member if needed.  
**Acceptance criteria**
- Admin can remove member
- Member loses access immediately
- Historical data remains (attribution preserved)

### J2 — Soft-delete/void records (optional in MVP)
**As a room,** we want to correct mistakes without destroying audit history.  
**Acceptance criteria**
- Records can be “voided” (status field)
- Voided records excluded from calculations but visible in history

---

## Definition of Done (DoD)
A story is done when:
- API route exists with auth + room authorization
- UI flow exists on mobile layout
- Errors are handled and shown
- Basic tests exist (unit/integration where applicable)
- Works in offline mode if it’s part of offline scope
- No secrets committed; env vars used for DB/keys
