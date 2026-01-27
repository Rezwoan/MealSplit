# MealSplit — Product Requirements Document (PRD)

**Product name:** MealSplit  
**Doc type:** PRD (for engineering + Copilot handoff)  
**Version:** 0.1  
**Last updated:** 2026-01-27  
**Primary platform:** PWA (installable web app)  
**Target hosting (MVP):** cPanel shared hosting (no SSH) + MySQL (phpMyAdmin) + Node app runner

---

## 1) One‑line pitch

**MealSplit** is a shared “room” app for **2–4 roommates** to track groceries, inventory, and meals, while keeping the **default cost split simple (equal)** but handling real-life exceptions (one person shopping, someone away/on break, uneven eating).

---

## 2) Problem statement

Roommates who share groceries commonly struggle with:

- Tracking **who paid** for each shopping trip and the **net balance** (who owes whom).
- Knowing **what’s currently in the kitchen** and what’s about to run out.
- Tracking **consumption** and optionally **nutrition** (protein/calories).
- Avoiding conflict caused by:
  - one roommate buying more frequently,
  - one roommate eating less for weeks (break / travel),
  - unclear “fairness” rules.

Current tools are either:
- expense split apps (good for money, weak on pantry/food),
- pantry/inventory apps (weak on money),
- fitness apps (not built for shared households).

MealSplit combines these into one simple, roommate-first workflow.

---

## 3) Goals and success metrics

### 3.1 Product goals
1. **Fairness without friction**
   - Default is equal split, but exceptions are easy to apply.
2. **Fast daily usage**
   - “Eat” and “Replenish” are quick actions, optimized for phones.
3. **Clarity**
   - Users can answer in seconds: “What’s left?”, “What’s running out?”, “Who owes what?”
4. **Shareable product**
   - Works for multiple rooms; max 4 members per room.

### 3.2 MVP success metrics (practical)
- **Activation:** user creates a room and adds 1 roommate successfully.
- **Engagement:** at least 3 actions/week per room (purchase, eat, replenish).
- **Retention:** at least 4 active weeks for a room.
- **Trust:** fewer “manual disputes” (qualitative feedback).

---

## 4) Target users and personas

### Primary users
- 2–4 roommates sharing groceries, cooking, and meals.

### Personas
- **Organizer:** wants clean tracking, does more shopping, hates confusion.
- **Casual roommate:** will only log if it’s easy and fast.
- **Gym-focused:** cares about protein and consistency.
- **“On break” roommate:** away/fasting for weeks; needs costs adjusted.

---

## 5) Scope and positioning

### 5.1 What MealSplit is
- A **room-based** tracker (expenses + pantry + meals + optional nutrition).
- **Equal split by default**, with simple exception tools.

### 5.2 What MealSplit is NOT (non-goals for MVP)
- A complete budgeting app for all personal expenses.
- A recipe planner or meal prep planner.
- A barcode scanner app.
- A full OCR receipt parser (can be future).

---

## 6) Key product principles

1. **Simple mode first**
   - Equal split across active roommates by default.
2. **Optional “Fairness layers”**
   - Exceptions exist (break/away periods), but they must be easy and not mandatory.
3. **Auditability**
   - Users should be able to see *why* the current balances are what they are.
4. **Offline-first**
   - Core flows work offline and sync later.
5. **Room privacy**
   - Data is visible only within the room.

---

## 7) Core features (MVP)

### 7.1 Accounts & profiles
**Requirements**
- Sign up, sign in, sign out
- Password reset
- Edit profile: name, avatar (optional), nutrition targets
- Personal theming preferences:
  - Light / Dark / AMOLED
  - Personal accent color
  - Display roommate colors consistently across the room

**Acceptance**
- User can manage profile and theme without affecting other rooms unless they choose to.

---

### 7.2 Rooms (2–4 members)
**Requirements**
- Create room (becomes room admin/owner)
- Join room via invite code/link
- Room membership confirmation (“roommate handshake”):
  - inviter confirms invitee
  - invitee confirms participation
  - only then is membership “active”
- Max 4 members per room
- Leave room (if not last admin), or transfer ownership

**Room settings**
- Currency (default)
- Default split rule: equal (1/N)
- “Active member” states driven by break periods (see 7.3.3)

---

### 7.3 Purchases, splitting, and balances (core)
This is the **heart** of the app: who paid, who owes, and the total.

#### 7.3.1 Add purchase (shopping)
**Requirements**
- Add purchase with:
  - total amount
  - payer (which member paid)
  - date/time
  - optional notes
  - optional category (groceries/snacks/household/etc.)
- Two entry modes:
  - **Quick Add** (fast): amount + payer + (optional) 1–3 item names
  - **Detailed Add**: add line items with qty/unit/price (optional)

#### 7.3.2 Attach receipts/photos
**Requirements**
- Upload 1+ images per purchase (receipt/memo/photo)
- Images stored with the purchase record
- Image viewing in purchase detail

> Note: OCR is out of MVP; the photo is for reference and trust.

#### 7.3.3 Equal split by default + “break periods”
**Default logic**
- Each purchase is split equally among **active members at that time**.

**Break / away periods**
- A user can set a date range for a member:
  - “Excluded” (0 share) OR custom share weight
- Example: “Jan 10–Jan 25: Panda on break” → Panda not included in split.

**Why this exists**
- Real-life: sometimes one roommate doesn’t eat for weeks; costs shouldn’t split equally.

#### 7.3.4 Balances (“who owes whom”)
**Requirements**
- Balance view shows:
  - per-member totals: paid, share, net
  - pairwise net settlement suggestion (who owes whom and how much)
- Purchases must clearly explain how split was applied.
- Optional: “Record settlement payment” (mark a debt as paid)

---

### 7.4 Inventory management (shared pantry)
**Requirements**
- Inventory item fields:
  - name
  - category (protein/carb/veg/snacks/spices/other)
  - quantity tracking mode:
    - **by units** (g/kg/l/pcs) OR
    - **by servings** (serving count)
  - low-stock threshold (optional)
  - expiry date (optional)
  - photo/icon (optional)

**Actions**
- Add item
- Replenish stock (increase) — gesture-friendly
- Eat/consume (decrease) — gesture-friendly
- Waste/expired (decrease with reason)

**System design**
- Inventory is tracked via **movements** (IN/OUT) for auditability.

---

### 7.5 Consumption logging & nutrition (optional but included in MVP)
**Requirements**
- Log “Eat” events:
  - item
  - eater(s): one or multiple
  - amount (qty or serving)
  - meal type: breakfast/lunch/dinner/snack
  - date/time
- Nutrition profiles for items (manual entry):
  - per 100g or per serving:
    - calories
    - protein
- User targets:
  - daily calories target (optional)
  - daily protein target (optional)

**Outputs**
- Today/weekly totals per user
- Protein vs target chart

> Nutrition should be fast, not perfect. Manual profiles + presets are MVP.

---

### 7.6 Dashboard & analytics
**Home dashboard includes**
- **Today card**:
  - “Today spent”
  - “Today protein/calories”
  - “Top item running out”
- Current room balance summary
- Inventory alerts:
  - low stock
  - expiring soon
- “Runway estimate” (non-AI heuristic):
  - days left based on average daily usage

**Charts**
- Spending trend
- Category breakdown
- Protein trend per user
- Most consumed items (optional)

---

### 7.7 Offline-first + sync
**Requirements**
- App works offline for:
  - viewing inventory
  - adding eat logs
  - creating draft purchases
- Offline actions are stored locally (IndexedDB) and synced later.
- Conflict approach (MVP):
  - inventory uses **movement logs** (append-only) to avoid conflicts
  - simple “last-write-wins” for editable entities (profile, room settings) with `updated_at`

---

## 8) Future / post-MVP features (V1/V2)

### V1 (quality + retention)
- Templates: “Typical Grocery Run”
- Better analytics filters
- Expiry/low-stock notifications (in-app)
- Improved settlement management (payment records)

### V2 (smart + power features)
- Optional OCR assistance for receipts
- Smarter runway prediction (day-of-week patterns)
- Suggested shopping list and quantities
- Web push notifications (if hosting supports it reliably)

---

## 9) Roles, permissions, and privacy

### Roles
- **Room owner/admin**
  - manage invites, remove members, edit room settings
- **Member**
  - add purchases, log eating, manage inventory
- **Pending member**
  - limited access until handshake confirmation

### Privacy/security rules (must-have)
- Users can only access rooms they belong to.
- Purchases, inventory, and logs are room-scoped.
- Receipt images are access-controlled.

---

## 10) Technical constraints and decisions (important for Copilot)

### Hosting constraints
- cPanel entry-level shared hosting
- **No SSH access**
- Node apps deployed via cPanel “Setup Node.js App”
- MySQL managed via cPanel + phpMyAdmin
- Avoid dependencies requiring native binaries or server-side generators

### Recommended implementation stack
- **Frontend:** React + Vite + PWA plugin, TailwindCSS, Recharts, Framer Motion, Dexie (IndexedDB)
- **Backend:** Fastify + TypeScript
- **DB:** MySQL + **Drizzle ORM**
- **Uploads:** store receipts on server disk in MVP (later move to object storage)

### Deployment strategy
- `app.yourdomain.com` → React static build
- `api.yourdomain.com` → Node Fastify API
- CORS configured for `app.*` to call `api.*`

---

## 11) Data model (high-level)

### Core entities
- `users`
- `user_profiles` (or profile fields on users)
- `rooms`
- `room_memberships` (role, status, joined_at, color)
- `room_invites` (code, inviter, invitee_email, status, expires_at)
- `purchases` (room_id, payer_id, total_amount, created_at)
- `purchase_items` (optional line items)
- `purchase_attachments` (receipt images)
- `split_rules` (default equal per room)
- `member_break_periods` (room_id, user_id, start_date, end_date, mode/weight)
- `inventory_items` (room_id, name, category, tracking_mode, unit, low_stock, expiry)
- `inventory_movements` (room_id, item_id, type IN/OUT, qty, reason, created_by, created_at)
- `consumption_logs` (room_id, item_id, eater_id(s), qty, meal_type, created_at)
- `nutrition_profiles` (item_id or food_key, per_unit calories/protein)

> Note: design should favor append-only logs (purchases, movements, consumption) for auditability.

---

## 12) API surface (high-level)

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Profile
- `GET /me`
- `PATCH /me`

### Rooms
- `POST /rooms`
- `GET /rooms`
- `GET /rooms/:id`
- `PATCH /rooms/:id`
- `POST /rooms/:id/invites`
- `POST /invites/:code/accept`
- `POST /rooms/:id/members/:memberId/confirm`
- `DELETE /rooms/:id/members/:memberId` (admin)
- `POST /rooms/:id/leave`

### Purchases / balances
- `POST /rooms/:id/purchases`
- `GET /rooms/:id/purchases`
- `GET /rooms/:id/purchases/:purchaseId`
- `POST /rooms/:id/purchases/:purchaseId/attachments`
- `GET /rooms/:id/balances` (computed)
- `POST /rooms/:id/settlements` (optional)

### Break periods
- `POST /rooms/:id/break-periods`
- `GET /rooms/:id/break-periods`
- `DELETE /rooms/:id/break-periods/:id`

### Inventory
- `POST /rooms/:id/inventory/items`
- `GET /rooms/:id/inventory/items`
- `PATCH /rooms/:id/inventory/items/:itemId`
- `POST /rooms/:id/inventory/movements` (replenish/eat/waste)
- `GET /rooms/:id/inventory/alerts`

### Consumption & nutrition
- `POST /rooms/:id/consumption`
- `GET /rooms/:id/consumption`
- `PUT /rooms/:id/items/:itemId/nutrition-profile`
- `GET /rooms/:id/stats` (dashboard)

---

## 13) Non-functional requirements

- **Performance:** dashboard loads < 2s on average mobile networks
- **Reliability:** no data loss; offline queue robust
- **Security:** hashed passwords (argon2/bcrypt), JWT/refresh, rate limiting
- **Accessibility:** basic keyboard support + readable contrast
- **Responsiveness:** phone-first, tablet/desktop friendly
- **Observability (MVP):** server logs + structured error responses

---

## 14) Risks and mitigations

- **Logging fatigue**
  - Mitigate with Quick Add, presets, templates, optional detail.
- **“Fairness wars”**
  - Default to simple equal split, add break periods (date range), keep consumption-based costs optional.
- **Shared hosting limitations**
  - Avoid websockets requirement, keep background tasks minimal, use cron if needed.
- **Storage growth from receipt photos**
  - Compress images client-side; later move to object storage.

---

## 15) Open questions (mark TBD in implementation if needed)
- Exact currencies/localization requirements?
- Will rooms allow multiple rooms per user at MVP? (Recommended: yes)
- What is the default “invite expiry” duration?
- Should settlement payments be a first-class feature in MVP or V1?
- Should users be able to delete purchases/logs, or only “void” them?

---

## 16) Copilot usage note
This document is intended to be given to an AI coding assistant. When generating code:
- prefer the simplest working implementation that satisfies MVP requirements
- follow the hosting constraints (no SSH, avoid native binaries)
- implement room-scoped authorization checks on every route
- keep the frontend offline-capable with a local sync queue
