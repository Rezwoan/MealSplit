# User Profiles + Stats + Theming - Implementation Guide

## Overview

This feature adds user profiles, statistics, and comprehensive theming (light/dark/amoled with custom accent colors) to MealSplit.

## Database Migration

**File:** `api/drizzle/0007_user_profiles.sql`

### Changes:
1. **Extended `users` table:**
   - `avatar_url` VARCHAR(500) NULL - for future avatar uploads
   - `bio` VARCHAR(280) NULL - short user bio

2. **Created `user_preferences` table:**
   - `user_id` VARCHAR(36) PRIMARY KEY (FK to users)
   - `theme_mode` ENUM('light', 'dark', 'amoled') DEFAULT 'dark'
   - `accent_hue` INT DEFAULT 190 (0-360 for HSL color)
   - `created_at`, `updated_at` timestamps
   - CHECK constraint: accent_hue between 0 and 360

3. **Data Migration:**
   - Automatically creates default preferences for existing users

## API Endpoints

### GET /me
**Purpose:** Get current user profile with preferences

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": null,
    "bio": "Food lover and roommate",
    "preferences": {
      "themeMode": "dark",
      "accentHue": 190
    }
  }
}
```

### PATCH /me
**Purpose:** Update user profile

**Request Body:**
```json
{
  "displayName": "Jane Doe",
  "bio": "Updated bio",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Validation:**
- displayName: 1-100 characters
- bio: max 280 characters
- avatarUrl: max 500 characters
- All fields optional

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "Updated bio"
  }
}
```

### GET /me/preferences
**Purpose:** Get user theme preferences

**Response:**
```json
{
  "preferences": {
    "themeMode": "dark",
    "accentHue": 190
  }
}
```

### PATCH /me/preferences
**Purpose:** Update theme preferences

**Request Body:**
```json
{
  "themeMode": "amoled",
  "accentHue": 270
}
```

**Validation:**
- themeMode: must be 'light', 'dark', or 'amoled'
- accentHue: integer 0-360
- Both fields optional

**Response:**
```json
{
  "preferences": {
    "themeMode": "amoled",
    "accentHue": 270
  }
}
```

### GET /me/stats
**Purpose:** Get user statistics across all rooms

**Response:**
```json
{
  "stats": {
    "roomsCount": 3,
    "purchasesCount": 42,
    "totalPaidCents": 125000,
    "totalShareCents": 98000,
    "netCents": 27000,
    "last30Days": {
      "purchasesCount": 8,
      "totalPaidCents": 15000
    }
  }
}
```

**Calculation Logic:**
- `roomsCount`: Active room memberships
- `purchasesCount`: Total purchases paid by user
- `totalPaidCents`: Sum of all purchases user paid for
- `totalShareCents`: Sum of user's share across all purchases
- `netCents`: `totalPaid - totalShare + settlementsReceived - settlementsPaid`
- `last30Days`: Stats for purchases in last 30 days

## Frontend Implementation

### New Page: /me (Profile & Settings)

**Route:** `/me`  
**Component:** `web/src/pages/Profile.tsx`

**Sections:**

#### 1. Profile Information
- Display name (editable)
- Email (read-only)
- Bio textarea (editable, 280 char limit)
- Character counter
- Save button

#### 2. Theme & Appearance
**Theme Mode Selector:**
- Three buttons: Light / Dark / AMOLED
- Active button highlighted with primary color

**Accent Color Picker:**
- 8 preset color buttons (Cyan, Blue, Purple, Pink, Red, Orange, Yellow, Green)
- Custom hue slider (0-360°)
- Rainbow gradient on slider
- Live preview swatch
- Current hue display

**Save Preferences Button:**
- Applies theme immediately
- Saves to backend
- Updates localStorage cache

#### 3. Statistics Card
**Overall Stats:**
- Active Rooms count
- Total Purchases count
- Total Paid amount
- Total Share amount
- Net Balance (green if positive, red if negative)

**Last 30 Days:**
- Purchases count
- Total Paid amount

### Theme System

**Implementation:** CSS Variables + data-theme attribute

**Files Modified:**
- `web/src/index.css` - CSS variable definitions
- `web/src/main.tsx` - Theme initialization on boot

**CSS Variables:**
```css
:root {
  --accent-hue: 190; /* Set dynamically */
  --primary: var(--accent-hue) 70% 50%;
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  /* ... more variables ... */
}

[data-theme="dark"] {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --primary: var(--accent-hue) 70% 50%;
  /* ... dark theme overrides ... */
}

[data-theme="amoled"] {
  --background: 0 0% 0%; /* Pure black */
  --foreground: 210 40% 98%;
  --primary: var(--accent-hue) 70% 50%;
  /* ... AMOLED overrides ... */
}
```

**Theme Application:**
```typescript
// Set theme attribute
document.documentElement.setAttribute('data-theme', mode)

// Set accent hue variable
document.documentElement.style.setProperty('--accent-hue', hue.toString())

// Cache for fast boot
localStorage.setItem('theme', mode)
localStorage.setItem('accentHue', hue.toString())
```

**Boot Sequence:**
1. `main.tsx` reads localStorage and applies cached theme immediately
2. After login, Profile page fetches `/me` and updates if backend differs
3. User changes are saved to backend and localStorage simultaneously

### Navigation

**Added to AppShell header:**
- "Profile" button between "Rooms" and "Logout"
- Active state when on /me route
- Uses User icon from lucide-react

## Testing

### Backend Testing (curl)

#### 1. Get Current User Profile
```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** User data with preferences object

#### 2. Update Profile
```bash
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Name",
    "bio": "This is my new bio!"
  }'
```

**Expected:** Updated user object

#### 3. Get Preferences
```bash
curl http://localhost:3000/me/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
```json
{
  "preferences": {
    "themeMode": "dark",
    "accentHue": 190
  }
}
```

#### 4. Update Theme to Light with Purple Accent
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "light",
    "accentHue": 270
  }'
```

**Expected:** Updated preferences

#### 5. Update to AMOLED Theme
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "amoled"
  }'
```

**Expected:** Theme updated, accentHue unchanged

#### 6. Get User Stats
```bash
curl http://localhost:3000/me/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
```json
{
  "stats": {
    "roomsCount": 2,
    "purchasesCount": 15,
    "totalPaidCents": 45000,
    "totalShareCents": 38000,
    "netCents": 7000,
    "last30Days": {
      "purchasesCount": 5,
      "totalPaidCents": 12000
    }
  }
}
```

#### 7. Test Invalid Accent Hue
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accentHue": 400
  }'
```

**Expected:** HTTP 400 with validation error

### Frontend Testing

#### 1. Theme Switching
1. Login and navigate to /me
2. Click "Light" theme button
3. Verify background changes to white
4. Click "Save Preferences"
5. Refresh page
6. Verify theme persists as Light

#### 2. AMOLED Theme
1. Select "AMOLED" theme
2. Verify background is pure black (#000000)
3. Save preferences
4. Navigate to other pages (Rooms, Purchases)
5. Verify theme applies globally

#### 3. Accent Color Presets
1. Click each preset color button
2. Verify preview swatch updates immediately
3. Select Purple preset (hue 270)
4. Save preferences
5. Verify primary buttons use purple color
6. Check other UI elements update accent

#### 4. Custom Accent Hue
1. Drag hue slider to 0 (red)
2. Verify live preview updates
3. Verify hue display shows "0°"
4. Save preferences
5. Navigate to Purchases page
6. Verify primary buttons are red

#### 5. Profile Editing
1. Update display name
2. Add bio text
3. Click "Save Profile"
4. Refresh page
5. Verify changes persist

#### 6. Bio Character Counter
1. Type in bio textarea
2. Verify character count updates live
3. Try typing beyond 280 characters
4. Verify maxLength prevents input

#### 7. Statistics Display
1. View stats card
2. Verify room count matches active rooms
3. Check net balance color (green if positive)
4. Verify last 30 days section displays
5. Create new purchase
6. Refresh /me page
7. Verify stats update

#### 8. Theme Cache on Boot
1. Set theme to AMOLED, accent to Green (hue 140)
2. Save preferences
3. Close browser completely
4. Reopen and navigate to app
5. Verify theme applies BEFORE any API calls complete
6. Verify no flash of wrong theme

## Accent Hue Presets

| Color  | Hue | Use Case           |
|--------|-----|--------------------|
| Cyan   | 190 | Default (ocean)    |
| Blue   | 220 | Professional       |
| Purple | 270 | Creative           |
| Pink   | 330 | Playful            |
| Red    | 0   | Bold               |
| Orange | 30  | Warm               |
| Yellow | 60  | Energetic          |
| Green  | 140 | Natural            |

## Database Schema

### users (extended)
```sql
ALTER TABLE users 
ADD COLUMN avatar_url VARCHAR(500) NULL AFTER email,
ADD COLUMN bio VARCHAR(280) NULL AFTER avatar_url;
```

### user_preferences (new)
```sql
CREATE TABLE user_preferences (
  user_id VARCHAR(36) PRIMARY KEY,
  theme_mode ENUM('light', 'dark', 'amoled') NOT NULL DEFAULT 'dark',
  accent_hue INT NOT NULL DEFAULT 190,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (accent_hue >= 0 AND accent_hue <= 360)
);
```

## Architecture Decisions

### Why HSL Hue (0-360) for Accent?
- More intuitive than RGB/hex
- Easy to generate color variations (adjust lightness/saturation)
- Perfect for CSS `hsl()` function
- Enables smooth color transitions

### Why Separate Preferences Table?
- Clean separation of concerns
- Easy to extend with more preferences later
- Can query/update preferences independently
- 1:1 relationship with optional preferences

### Why localStorage + Backend?
- **localStorage:** Instant theme on boot, no flash
- **Backend:** Source of truth, syncs across devices
- **Both:** Best UX + data persistence

### Why AMOLED Theme?
- Power saving on OLED screens
- Popular user request
- Distinguishes from regular dark mode
- Pure black (#000) looks stunning on modern displays

### Why Limit Bio to 280 chars?
- Similar to Twitter (concise)
- Prevents database bloat
- Encourages meaningful content
- Easy to display in UI

## Future Enhancements

Potential features not in this slice:
- Avatar upload functionality
- Export user data
- Activity timeline
- Spending trends chart
- Category-based stats
- Room-specific stats
- Custom accent color per room
- Theme schedule (auto dark at night)

## Migration Steps

1. **Apply Migration:**
   ```bash
   mysql -u root mealsplit < api/drizzle/0007_user_profiles.sql
   ```

2. **Verify Tables:**
   ```sql
   DESCRIBE users;
   -- Should show avatar_url and bio columns
   
   DESCRIBE user_preferences;
   -- Should show theme_mode and accent_hue
   ```

3. **Check Data Migration:**
   ```sql
   SELECT COUNT(*) FROM user_preferences;
   -- Should equal number of users
   ```

4. **Test Endpoints:**
   - GET /me → includes preferences
   - PATCH /me/preferences → updates theme
   - GET /me/stats → returns stats

5. **Test Frontend:**
   - Navigate to /me
   - Switch themes
   - Change accent color
   - Refresh and verify persistence

## Troubleshooting

### Theme not applying
- Check localStorage: `localStorage.getItem('theme')`
- Verify data-theme attribute on html element
- Check CSS variables in DevTools

### Stats showing zero
- Verify user has active room memberships
- Check purchases exist with user as payer
- Ensure settlements are recorded

### Accent color not updating
- Verify --accent-hue CSS variable is set
- Check primary color uses `hsl(var(--accent-hue), 70%, 50%)`
- Clear browser cache if stale

### Profile updates not saving
- Check Authorization header present
- Verify displayName not empty
- Check bio under 280 chars

## Success Criteria

✅ Migration creates preferences table with defaults  
✅ GET /me includes preferences object  
✅ PATCH /me updates profile fields  
✅ PATCH /me/preferences updates theme/accent  
✅ GET /me/stats returns accurate calculations  
✅ Theme switches apply globally and instantly  
✅ Theme persists across page refreshes  
✅ Accent color drives primary UI elements  
✅ Profile page displays all sections correctly  
✅ Stats reflect actual user activity  

When all criteria met, feature is ready for production!
