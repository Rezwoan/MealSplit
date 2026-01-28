# Smart Splits Guide

This guide explains the Smart Splits feature, which allows custom split modes for purchases beyond equal splitting.

## Overview

MealSplit now supports three split modes:
1. **Equal Split** (default) - Divides the total evenly among active members
2. **Custom Amount** - Each member pays a specific dollar amount
3. **Custom Percent** - Each member pays a specific percentage

All splits automatically exclude members on break during the purchase date.

## Split Modes

### 1. Equal Split (Default)

The purchase total is divided equally among all eligible members. Any remainder cents are distributed in a stable, sorted manner.

**Example:** $10.01 split between Alice and Bob
- Alice: $5.01 (501 cents)
- Bob: $5.00 (500 cents)

### 2. Custom Amount Split

Each member pays a specific dollar amount. The sum of all custom amounts must equal the total purchase amount.

**Use Cases:**
- Different meal portions
- Some members buying extra items
- Unequal consumption

**Validation:**
- All eligible members must have an amount specified
- Sum must equal total (within 1 cent tolerance)
- No negative amounts allowed

### 3. Custom Percent Split

Each member pays a specific percentage of the total. The sum of all percentages must equal 100%.

**Use Cases:**
- Proportional sharing based on usage
- Income-based splitting
- Flexible arrangements

**Storage:** Percentages are stored as basis points (1% = 100 basis points, 25.5% = 2550 basis points) for precision.

**Validation:**
- All eligible members must have a percentage specified
- Sum must equal 100% (within 0.01% tolerance)
- Range: 0-100%

**Rounding:** The total is multiplied by each percentage, floored, then remainder cents are distributed in sorted order by user ID.

## Database Schema

### purchases table
```sql
ALTER TABLE purchases ADD COLUMN split_mode 
  ENUM('equal', 'custom_amount', 'custom_percent') 
  DEFAULT 'equal';
```

### purchase_split_inputs table
Stores the original user input values for custom splits (for future editing capability):
```sql
CREATE TABLE purchase_split_inputs (
  id CHAR(36) PRIMARY KEY,
  purchase_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  input_value INT NOT NULL,  -- cents for custom_amount, basis points for custom_percent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_purchase_user (purchase_id, user_id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

The `purchase_splits` table (unchanged) stores the computed share amounts in cents.

## API Usage

### Create Purchase with Equal Split (Default)

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "25.50",
    "payerUserId": "USER_ID",
    "purchasedAt": "2025-01-15T18:00:00Z",
    "notes": "Groceries",
    "category": "Food"
  }'
```

### Create Purchase with Custom Amount Split

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_amount",
    "splitInputs": [
      {"userId": "alice-id", "value": "12.00"},
      {"userId": "bob-id", "value": "10.00"},
      {"userId": "charlie-id", "value": "8.00"}
    ],
    "purchasedAt": "2025-01-15T18:00:00Z",
    "notes": "Dinner with different portions",
    "category": "Food"
  }'
```

**Validation:** Sum of values (12 + 10 + 8 = 30) must equal totalAmount (30.00)

### Create Purchase with Custom Percent Split

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "100.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "alice-id", "value": "40"},
      {"userId": "bob-id", "value": "35"},
      {"userId": "charlie-id", "value": "25"}
    ],
    "purchasedAt": "2025-01-15T18:00:00Z",
    "notes": "Shared utilities",
    "category": "Utilities"
  }'
```

**Validation:** Sum of percentages (40 + 35 + 25 = 100) must equal 100%

**Result:**
- Alice: $40.00 (40% of $100)
- Bob: $35.00 (35% of $100)
- Charlie: $25.00 (25% of $100)

### Get Purchase Details with Split Info

```bash
curl http://localhost:3000/rooms/ROOM_ID/purchases/PURCHASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "purchase": {
    "id": "abc123",
    "totalAmountCents": 10000,
    "splitMode": "custom_percent",
    ...
  },
  "splits": [
    {"userId": "alice-id", "displayName": "Alice", "shareAmountCents": 4000},
    {"userId": "bob-id", "displayName": "Bob", "shareAmountCents": 3500},
    {"userId": "charlie-id", "displayName": "Charlie", "shareAmountCents": 2500}
  ],
  "splitInputs": [
    {"userId": "alice-id", "inputValue": 4000},
    {"userId": "bob-id", "inputValue": 3500},
    {"userId": "charlie-id", "inputValue": 2500}
  ]
}
```

## Rounding Examples

### Custom Percent with Remainder

**Scenario:** $10.01 split 50/50 between Alice and Bob

**Calculation:**
1. Total: 1001 cents
2. Alice (50%): floor(1001 × 5000 / 10000) = floor(500.5) = 500 cents
3. Bob (50%): floor(1001 × 5000 / 10000) = 500 cents
4. Sum: 1000 cents, Remainder: 1 cent
5. Distribute remainder to user with lowest ID (stable sort)
6. Final: Alice: 501 cents ($5.01), Bob: 500 cents ($5.00)

### Uneven Percentages with Rounding

**Scenario:** $10.00 split 33.33% / 33.33% / 33.34%

**Calculation:**
1. Total: 1000 cents
2. Alice (33.33%): floor(1000 × 3333 / 10000) = 333 cents
3. Bob (33.33%): floor(1000 × 3333 / 10000) = 333 cents
4. Charlie (33.34%): floor(1000 × 3334 / 10000) = 333 cents
5. Sum: 999 cents, Remainder: 1 cent
6. Distribute to lowest ID
7. Final: 334 / 333 / 333 cents

## Break Periods Integration

Smart splits automatically respect break period exclusions. If a member is on break during the purchase date, they are excluded from the split calculation entirely.

**Example:**
- Room has 4 members: Alice, Bob, Charlie, David
- Charlie is on break from Jan 10-20
- Purchase made on Jan 15
- Custom split only requires values for Alice, Bob, and David

## Error Handling

### Missing Split Inputs
```json
{
  "message": "Custom amount split requires splitInputs"
}
```

### Invalid Sum (Custom Amount)
```json
{
  "message": "Sum must be within 1 cent of the total"
}
```

### Invalid Sum (Custom Percent)
```json
{
  "message": "Percentages must sum to 100% (10000 basis points)"
}
```

### Missing Member
```json
{
  "message": "All members must have a value: alice-id, bob-id"
}
```

### Extra User (Not a Member)
```json
{
  "message": "Users not in active members: charlie-id"
}
```

## Frontend Usage

The Purchases page now includes a split mode selector with three buttons:
- **Equal** (default)
- **Custom Amount**
- **Custom %**

When a custom mode is selected:
1. Input fields appear for each eligible member
2. Real-time validation shows sum progress
3. Submit button is disabled until validation passes
4. Color-coded feedback (red for invalid, green for valid)

Purchase Details Modal shows:
- Split mode badge (Equal, Custom Amount, or Custom %)
- Individual share amounts for each member
- Total verification

## Migration

To apply the Smart Splits migration:

```bash
# Import the migration SQL file
mysql -u root mealsplit < api/drizzle/0006_smart_splits.sql
```

Or through phpMyAdmin:
1. Select `mealsplit` database
2. Go to Import tab
3. Choose `api/drizzle/0006_smart_splits.sql`
4. Click "Go"

## Testing Checklist

- [ ] Create purchase with equal split (default behavior)
- [ ] Create purchase with custom amounts
  - [ ] Valid sum
  - [ ] Invalid sum (too high)
  - [ ] Invalid sum (too low)
  - [ ] Missing member value
- [ ] Create purchase with custom percentages
  - [ ] Valid sum (100%)
  - [ ] Invalid sum (>100%)
  - [ ] Invalid sum (<100%)
  - [ ] Decimal percentages (25.5%)
- [ ] Break period integration
  - [ ] Member on break excluded from split
  - [ ] Custom split with active members only
- [ ] View purchase details with split info
- [ ] Frontend validation
  - [ ] Real-time sum checking
  - [ ] Color-coded feedback
  - [ ] Submit button state

## Future Enhancements

Possible future features (not in this vertical slice):
- Edit existing purchase splits
- Split presets (save common split patterns)
- Named splits ("70/30 arrangement")
- Category-based default splits
- Historical split pattern suggestions
