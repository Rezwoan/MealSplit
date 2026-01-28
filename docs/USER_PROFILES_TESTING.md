# User Profiles & Theming - Quick Testing Guide

## Prerequisites

Get your auth token:
```bash
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  | jq -r '.token')
```

## 1. Get Current User Profile

```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

**Expected Response:**
```json
{
  "user": {
    "id": "abc123",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatarUrl": null,
    "bio": null,
    "preferences": {
      "themeMode": "dark",
      "accentHue": 190
    }
  }
}
```

## 2. Update Profile

```bash
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Jane Smith",
    "bio": "Food enthusiast and budget tracker extraordinaire!"
  }' \
  | jq '.'
```

**Expected:** Updated user object with new displayName and bio

## 3. Get Preferences Only

```bash
curl http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
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

## 4. Switch to Light Theme

```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "light"
  }' \
  | jq '.'
```

**Expected:** Preferences with themeMode: "light"

## 5. Switch to AMOLED Theme with Purple Accent

```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "amoled",
    "accentHue": 270
  }' \
  | jq '.'
```

**Expected:** Preferences with themeMode: "amoled", accentHue: 270

## 6. Change Only Accent Color (keep theme)

```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accentHue": 140
  }' \
  | jq '.'
```

**Expected:** accentHue updated to 140 (green), theme unchanged

## 7. Test All Accent Presets

### Cyan (default)
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 190}'
```

### Blue
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 220}'
```

### Purple
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 270}'
```

### Pink
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 330}'
```

### Red
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 0}'
```

### Orange
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 30}'
```

### Yellow
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 60}'
```

### Green
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accentHue": 140}'
```

## 8. Get User Statistics

```bash
curl http://localhost:3000/me/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

**Expected Response:**
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

**Interpretation:**
- User is in 2 active rooms
- Has paid for 15 purchases total
- Paid $450.00 total
- Share of all purchases: $380.00
- Net balance: +$70.00 (they're owed money)
- Last 30 days: 5 purchases, $120.00 paid

## 9. Test Validation Errors

### Invalid Theme Mode
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "invalid"
  }'
```

**Expected:** HTTP 400 with validation error

### Accent Hue Out of Range (too high)
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accentHue": 400
  }'
```

**Expected:** HTTP 400, accentHue must be 0-360

### Accent Hue Out of Range (negative)
```bash
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accentHue": -10
  }'
```

**Expected:** HTTP 400, accentHue must be 0-360

### Display Name Too Long
```bash
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "'$(python -c "print('A' * 101)")'"
  }'
```

**Expected:** HTTP 400, displayName max 100 chars

### Bio Too Long
```bash
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "'$(python -c "print('A' * 281)")'"
  }'
```

**Expected:** HTTP 400, bio max 280 chars

## 10. Complete Profile Setup Flow

```bash
# 1. Update profile information
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Alex Johnson",
    "bio": "Coffee addict. Meal prep enthusiast. Spreadsheet lover."
  }'

# 2. Set theme to dark with purple accent
curl -X PATCH http://localhost:3000/me/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "themeMode": "dark",
    "accentHue": 270
  }'

# 3. Verify everything saved
curl http://localhost:3000/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

**Expected:** User object with updated profile and purple dark theme

## Frontend Testing Checklist

After backend testing, test in browser:

### Navigation
- [ ] Login and see "Profile" button in header
- [ ] Click "Profile" button
- [ ] Verify redirect to /me
- [ ] Check active state on Profile button

### Profile Section
- [ ] Display name shows current value
- [ ] Email is read-only
- [ ] Bio is editable with character counter
- [ ] Counter updates as you type
- [ ] Max 280 characters enforced
- [ ] Save button works
- [ ] Success feedback on save

### Theme Section
- [ ] Three theme buttons visible
- [ ] Current theme button highlighted
- [ ] Clicking theme button updates preview
- [ ] 8 preset color buttons visible
- [ ] Clicking preset updates preview swatch
- [ ] Hue slider shows rainbow gradient
- [ ] Dragging slider updates preview
- [ ] Hue number displays current value
- [ ] Save Preferences button works

### Theme Persistence
- [ ] Change theme to AMOLED
- [ ] Change accent to Green (140)
- [ ] Save preferences
- [ ] Refresh page
- [ ] Theme still AMOLED with green accent
- [ ] Navigate to /rooms
- [ ] Theme persists
- [ ] Primary buttons use green color

### Stats Section
- [ ] Room count displays
- [ ] Purchase count displays
- [ ] Total paid shows correct currency
- [ ] Total share shows correct currency
- [ ] Net balance correct color (green/red)
- [ ] Net balance correct sign (+/-)
- [ ] Last 30 days section visible
- [ ] Last 30 days shows correct numbers

### Edge Cases
- [ ] Clear bio and save (should save as null)
- [ ] Type 280 chars in bio (should stop at limit)
- [ ] Switch theme multiple times quickly
- [ ] Close browser and reopen (theme persists)
- [ ] Test on mobile viewport (responsive)

## Database Verification

After testing, verify data in database:

```sql
-- Check user profile updated
SELECT id, display_name, bio FROM users WHERE email = 'test@example.com';

-- Check preferences saved
SELECT * FROM user_preferences WHERE user_id = 'USER_ID';

-- Verify default preferences created for all users
SELECT 
  u.email, 
  up.theme_mode, 
  up.accent_hue 
FROM users u 
LEFT JOIN user_preferences up ON u.id = up.user_id;
```

## Troubleshooting

### "Preferences not found"
Migration didn't run or failed. Check user_preferences table exists.

### Theme not applying
Check localStorage in browser DevTools:
```javascript
localStorage.getItem('theme')
localStorage.getItem('accentHue')
```

### Stats show 0 for everything
User has no purchases or room memberships yet. Create test data first.

### Accent color not changing UI
CSS variables not applied. Check:
1. data-theme attribute on html element
2. --accent-hue CSS variable in DevTools
3. Button classes use primary color

## Success Indicators

✅ All curl commands return expected responses  
✅ Theme switches apply immediately in UI  
✅ Accent colors drive primary button colors  
✅ Profile updates persist across page refreshes  
✅ Stats reflect actual user activity  
✅ Validation errors caught correctly  
✅ No console errors in browser  
✅ Theme persists after browser close/reopen  

When all pass, feature is production-ready!
