# Smart Splits - Quick curl Reference

Quick reference for testing Smart Splits feature with curl.

## Setup

First, get your auth token:
```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  | jq -r '.token')

# Use TOKEN in subsequent requests
```

## Equal Split (Default)

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "25.50",
    "payerUserId": "USER_ID",
    "purchasedAt": "2025-01-15T18:00:00Z",
    "category": "Groceries",
    "notes": "Weekly shopping"
  }'
```

**Result:** Amount divided equally among all active members

## Custom Amount Split

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
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
    "category": "Dinner",
    "notes": "Different portions"
  }'
```

**Result:**
- Alice: $12.00
- Bob: $10.00
- Charlie: $8.00
- Total: $30.00 ✓

## Custom Percent Split

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
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
    "category": "Utilities",
    "notes": "Monthly bills"
  }'
```

**Result:**
- Alice: $40.00 (40%)
- Bob: $35.00 (35%)
- Charlie: $25.00 (25%)
- Total: $100.00 ✓

## Decimal Percentages

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "50.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "alice-id", "value": "33.33"},
      {"userId": "bob-id", "value": "33.33"},
      {"userId": "charlie-id", "value": "33.34"}
    ]
  }'
```

**Result:**
- Alice: $16.67 (33.33%)
- Bob: $16.67 (33.33%)
- Charlie: $16.66 (33.34%)
- Total: $50.00 ✓

## Get Purchase Details

```bash
curl http://localhost:3000/rooms/ROOM_ID/purchases/PURCHASE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "purchase": {
    "id": "abc123",
    "totalAmountCents": 10000,
    "splitMode": "custom_percent",
    "payerUserId": "alice-id",
    "currency": "USD",
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

## Error Cases

### Invalid Sum (Custom Amount)

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_amount",
    "splitInputs": [
      {"userId": "alice-id", "value": "10.00"},
      {"userId": "bob-id", "value": "10.00"}
    ]
  }'
```

**Error:** `Sum must be within 1 cent of the total`

### Invalid Sum (Custom Percent)

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "100.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_percent",
    "splitInputs": [
      {"userId": "alice-id", "value": "40"},
      {"userId": "bob-id", "value": "40"}
    ]
  }'
```

**Error:** `Percentages must sum to 100% (10000 basis points)`

### Missing Member

```bash
curl -X POST http://localhost:3000/rooms/ROOM_ID/purchases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "30.00",
    "payerUserId": "USER_ID",
    "splitMode": "custom_amount",
    "splitInputs": [
      {"userId": "alice-id", "value": "15.00"},
      {"userId": "bob-id", "value": "15.00"}
    ]
  }'
```

**Error (if room has 3 active members):** `All members must have a value: charlie-id`

## Tips

1. **Get Room Members First:**
   ```bash
   curl http://localhost:3000/rooms/ROOM_ID \
     -H "Authorization: Bearer $TOKEN" \
     | jq '.members[] | {userId, displayName}'
   ```

2. **List Recent Purchases:**
   ```bash
   curl http://localhost:3000/rooms/ROOM_ID/purchases \
     -H "Authorization: Bearer $TOKEN" \
     | jq '.purchases[] | {id, totalAmountCents, splitMode}'
   ```

3. **Pretty Print JSON:**
   ```bash
   curl ... | jq '.'
   ```

4. **Save Response to File:**
   ```bash
   curl ... > response.json
   ```

## Common Scenarios

### 50/50 Split
```json
{
  "splitMode": "custom_percent",
  "splitInputs": [
    {"userId": "user1", "value": "50"},
    {"userId": "user2", "value": "50"}
  ]
}
```

### 70/30 Split
```json
{
  "splitMode": "custom_percent",
  "splitInputs": [
    {"userId": "user1", "value": "70"},
    {"userId": "user2", "value": "30"}
  ]
}
```

### One Person Pays More
```json
{
  "totalAmount": "50.00",
  "splitMode": "custom_amount",
  "splitInputs": [
    {"userId": "user1", "value": "30.00"},
    {"userId": "user2", "value": "20.00"}
  ]
}
```

### Equal Three-Way (33.33% each)
```json
{
  "splitMode": "custom_percent",
  "splitInputs": [
    {"userId": "user1", "value": "33.33"},
    {"userId": "user2", "value": "33.33"},
    {"userId": "user3", "value": "33.34"}
  ]
}
```

Note: Last person gets slightly more to reach 100%
