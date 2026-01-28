# Smart Splits Testing Guide

Step-by-step guide for testing the Smart Splits feature.

## Prerequisites

1. ✅ Database migration 0006 applied
2. ✅ Backend server running (port 3000)
3. ✅ Frontend server running (port 5173)
4. ✅ Test user accounts created
5. ✅ Test room created with 3+ members

## Step 1: Apply Database Migration

### Option A: phpMyAdmin
1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Select `mealsplit` database
3. Click Import tab
4. Choose file: `api/drizzle/0006_smart_splits.sql`
5. Click "Go"
6. Verify success message

### Option B: Command Line
```bash
cd e:\MealSplit
mysql -u root mealsplit < api/drizzle/0006_smart_splits.sql
```

### Verification
```sql
-- Check split_mode column exists
DESCRIBE purchases;
-- Should show: split_mode enum('equal','custom_amount','custom_percent') DEFAULT 'equal'

-- Check new table exists
DESCRIBE purchase_split_inputs;
-- Should show: id, purchase_id, user_id, input_value, created_at
```

## Step 2: Start Development Servers

### Terminal 1 - Backend
```bash
cd e:\MealSplit\api
npm run dev
```
**Expected:** Server running on http://localhost:3000

### Terminal 2 - Frontend
```bash
cd e:\MealSplit\web
npm run dev
```
**Expected:** Server running on http://localhost:5173

## Step 3: Backend Testing with curl

### 3.1 Get Auth Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGc...",
  "userId": "abc123"
}
```

**Action:** Copy the token value for use in next requests. Set as environment variable:
```bash
# Windows PowerShell
$TOKEN = "your-token-here"

# Linux/Mac
export TOKEN="your-token-here"
```

### 3.2 Get Room Info
```bash
curl http://localhost:3000/rooms/YOUR_ROOM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "room": {
    "id": "room123",
    "name": "Test Room"
  },
  "members": [
    {"userId": "user1", "displayName": "Alice"},
    {"userId": "user2", "displayName": "Bob"},
    {"userId": "user3", "displayName": "Charlie"}
  ]
}
```

**Action:** Note the user IDs for split testing

### 3.3 Test Equal Split (Default)
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "category": "Test",
    "notes": "Equal split test"
  }'
```

**Expected Response:**
```json
{
  "purchase": {
    "id": "purchase123",
    "totalAmountCents": 3000,
    "splitMode": "equal"
  },
  "splits": [
    {"userId": "user1", "shareAmountCents": 1000},
    {"userId": "user2", "shareAmountCents": 1000},
    {"userId": "user3", "shareAmountCents": 1000}
  ]
}
```

**Verification:** $30.00 ÷ 3 = $10.00 each ✓

### 3.4 Test Custom Amount Split
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_amount",
    "splitInputs": [
      {"userId": "user1", "value": "15.00"},
      {"userId": "user2", "value": "10.00"},
      {"userId": "user3", "value": "5.00"}
    ],
    "category": "Test",
    "notes": "Custom amount test"
  }'
```

**Expected Response:**
```json
{
  "purchase": {
    "id": "purchase456",
    "totalAmountCents": 3000,
    "splitMode": "custom_amount"
  },
  "splits": [
    {"userId": "user1", "shareAmountCents": 1500},
    {"userId": "user2", "shareAmountCents": 1000},
    {"userId": "user3", "shareAmountCents": 500}
  ]
}
```

**Verification:** $15 + $10 + $5 = $30 ✓

### 3.5 Test Custom Percent Split
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "100.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "user1", "value": "50"},
      {"userId": "user2", "value": "30"},
      {"userId": "user3", "value": "20"}
    ],
    "category": "Test",
    "notes": "Custom percent test"
  }'
```

**Expected Response:**
```json
{
  "purchase": {
    "id": "purchase789",
    "totalAmountCents": 10000,
    "splitMode": "custom_percent"
  },
  "splits": [
    {"userId": "user1", "shareAmountCents": 5000},
    {"userId": "user2", "shareAmountCents": 3000},
    {"userId": "user3", "shareAmountCents": 2000}
  ]
}
```

**Verification:** 50% + 30% + 20% = 100% ✓

### 3.6 Test Rounding (Odd Amount)
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "10.01",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "user1", "value": "50"},
      {"userId": "user2", "value": "50"}
    ],
    "category": "Test",
    "notes": "Rounding test"
  }'
```

**Expected Response:**
```json
{
  "splits": [
    {"userId": "user1", "shareAmountCents": 501},
    {"userId": "user2", "shareAmountCents": 500}
  ]
}
```

**Verification:** 501 + 500 = 1001 cents = $10.01 ✓  
**Note:** Remainder distributed to first user in sorted order

### 3.7 Test Validation Error (Invalid Sum)
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_amount",
    "splitInputs": [
      {"userId": "user1", "value": "10.00"},
      {"userId": "user2", "value": "10.00"},
      {"userId": "user3", "value": "5.00"}
    ]
  }'
```

**Expected Response:** HTTP 400
```json
{
  "message": "Sum must be within 1 cent of the total"
}
```

**Verification:** Error correctly caught ($25 ≠ $30) ✓

### 3.8 Test Validation Error (Invalid Percent)
```bash
curl -X POST http://localhost:3000/rooms/YOUR_ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "100.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "user1", "value": "40"},
      {"userId": "user2", "value": "40"},
      {"userId": "user3", "value": "10"}
    ]
  }'
```

**Expected Response:** HTTP 400
```json
{
  "message": "Percentages must sum to 100% (10000 basis points)"
}
```

**Verification:** Error correctly caught (90% ≠ 100%) ✓

### 3.9 Get Purchase Details
```bash
curl http://localhost:3000/rooms/YOUR_ROOM_ID/purchases/PURCHASE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "purchase": {
    "id": "purchase123",
    "totalAmountCents": 10000,
    "splitMode": "custom_percent",
    ...
  },
  "splits": [
    {"userId": "user1", "displayName": "Alice", "shareAmountCents": 5000},
    {"userId": "user2", "displayName": "Bob", "shareAmountCents": 3000},
    {"userId": "user3", "displayName": "Charlie", "shareAmountCents": 2000}
  ],
  "splitInputs": [
    {"userId": "user1", "inputValue": 5000},
    {"userId": "user2", "inputValue": 3000},
    {"userId": "user3", "inputValue": 2000}
  ]
}
```

**Verification:** splitInputs returned for custom modes ✓

## Step 4: Frontend Testing

### 4.1 Login
1. Open http://localhost:5173
2. Login with test account
3. Navigate to test room

### 4.2 Test Split Mode Selector
1. Click "Add Purchase"
2. Verify three split mode buttons visible:
   - Equal (selected by default)
   - Custom Amount
   - Custom %
3. Click each button
4. Verify button style changes (active/inactive)

**Expected:** ✓ Mode switches correctly

### 4.3 Test Equal Split (Default)
1. Select "Equal" mode
2. Enter amount: $30.00
3. Select payer
4. Click "Save Purchase"

**Expected:**
- ✓ Success message
- ✓ Purchase appears in list
- ✓ Split calculated automatically

### 4.4 Test Custom Amount UI
1. Select "Custom Amount" mode
2. Verify input fields appear for each member
3. Enter amounts:
   - Alice: 15.00
   - Bob: 10.00
   - Charlie: 5.00
4. Verify validation message shows: "Split total: $30.00 ✓" (green)
5. Change Charlie to 4.00
6. Verify validation message shows: "Split total: $29.00 (needs $30.00)" (red)
7. Change back to 5.00
8. Click "Save Purchase"

**Expected:**
- ✓ Input fields appear/disappear when switching modes
- ✓ Real-time validation updates
- ✓ Color changes (green for valid, red for invalid)
- ✓ Submit disabled when invalid
- ✓ Success when sum matches

### 4.5 Test Custom Percent UI
1. Enter total amount: $100.00
2. Select "Custom %" mode
3. Enter percentages:
   - Alice: 50
   - Bob: 30
   - Charlie: 20
4. Verify validation message shows: "Split total: 100.0% ✓" (green)
5. Change Charlie to 15
6. Verify validation message shows: "Split total: 95.0% (needs 100%)" (red)
7. Change back to 20
8. Click "Save Purchase"

**Expected:**
- ✓ Percent validation works
- ✓ Real-time sum display
- ✓ Submit disabled when invalid
- ✓ Success when sum = 100%

### 4.6 Test Mode Switching
1. Select "Custom Amount"
2. Enter some values
3. Switch to "Custom %"
4. Verify previous values cleared
5. Switch to "Equal"
6. Verify custom inputs hidden

**Expected:**
- ✓ Inputs clear when switching modes
- ✓ UI updates correctly
- ✓ No leftover state

### 4.7 Test Purchase Details Modal
1. Click on a purchase with custom split
2. Verify modal opens
3. Check split details section
4. Verify split mode badge shown (e.g., "Custom Amount")
5. Verify individual amounts shown for each member

**Expected:**
- ✓ Split mode displayed
- ✓ Individual shares shown
- ✓ Total adds up correctly

### 4.8 Test Validation Error Display
1. Enter total: $30.00
2. Select "Custom Amount"
3. Enter amounts that don't sum correctly
4. Try to submit
5. Verify error message shown

**Expected:**
- ✓ Client-side validation prevents submission
- ✓ Clear error message displayed
- ✓ Submit button remains disabled

## Step 5: Edge Cases

### 5.1 Single Member Room
**Test:** Create purchase in room with only 1 active member

**Expected:** Equal split assigns 100% to that member

### 5.2 Large Number of Members
**Test:** Custom split with 5+ members

**Expected:** All input fields appear, validation works

### 5.3 Very Small Amount
**Test:** Split $0.01 equally between 2 members

**Expected:** 1 cent to first user, 0 cents to second

### 5.4 Large Percentages with Decimals
**Test:** 33.333333% three ways

**Expected:** Rounding handled correctly, total matches

### 5.5 Break Period Integration
**Test:** 
1. Create purchase in room with 3 members
2. Set one member on break for the purchase date
3. Create custom split

**Expected:** Only 2 input fields appear (active members only)

## Step 6: Database Verification

### Check Purchases Table
```sql
SELECT id, total_amount_cents, split_mode, notes 
FROM purchases 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** split_mode column populated correctly

### Check Split Inputs Table
```sql
SELECT psi.*, u.display_name, p.total_amount_cents
FROM purchase_split_inputs psi
JOIN users u ON psi.user_id = u.id
JOIN purchases p ON psi.purchase_id = p.id
ORDER BY psi.created_at DESC;
```

**Expected:** Input values stored (cents for amounts, basis points for percents)

### Verify Split Calculations
```sql
SELECT 
  p.id,
  p.total_amount_cents,
  p.split_mode,
  SUM(ps.share_amount_cents) as sum_shares
FROM purchases p
JOIN purchase_splits ps ON p.id = ps.purchase_id
GROUP BY p.id
HAVING p.total_amount_cents != sum_shares;
```

**Expected:** Empty result (all splits sum correctly)

## Checklist

### Backend
- [ ] Migration applied successfully
- [ ] Equal split creates purchase (default)
- [ ] Custom amount split with valid sum succeeds
- [ ] Custom percent split with 100% succeeds
- [ ] Invalid sum rejected (custom amount)
- [ ] Invalid sum rejected (custom percent)
- [ ] Missing member rejected
- [ ] Purchase details includes splitMode
- [ ] Purchase details includes splitInputs for custom modes
- [ ] Rounding test passes (remainder distributed)

### Frontend
- [ ] Split mode buttons render and switch correctly
- [ ] Custom input fields appear/disappear
- [ ] Real-time validation displays
- [ ] Color-coded feedback (green/red)
- [ ] Submit disabled when invalid
- [ ] Form submission succeeds
- [ ] Purchase appears in list
- [ ] Details modal shows split mode
- [ ] Details modal shows individual shares
- [ ] Mode switching clears inputs

### Database
- [ ] split_mode column exists on purchases
- [ ] purchase_split_inputs table exists
- [ ] Foreign keys and indexes created
- [ ] Split inputs stored correctly
- [ ] Computed splits match totals

## Troubleshooting

### "Column 'split_mode' doesn't exist"
**Solution:** Run migration 0006_smart_splits.sql

### "Table 'purchase_split_inputs' doesn't exist"
**Solution:** Check migration ran completely, verify with `SHOW TABLES;`

### Frontend shows split mode but backend rejects
**Solution:** Check API route accepts splitMode and splitInputs parameters

### Validation passes but API returns error
**Solution:** Check all active members included, no break periods active

### Splits don't sum to total
**Solution:** Check rounding logic in computeCustomPercentSplit function

## Success Criteria

✅ All backend curl tests pass  
✅ All frontend UI tests pass  
✅ Database schema correct  
✅ Validation errors caught correctly  
✅ Rounding handled properly  
✅ Break periods integration works  
✅ Purchase details display correctly  

When all tests pass, the Smart Splits feature is ready for production!
