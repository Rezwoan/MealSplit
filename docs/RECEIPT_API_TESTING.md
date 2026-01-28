# Receipt API Testing with cURL (PowerShell)

## Prerequisites

1. API running on http://localhost:3001
2. Valid JWT token (login first)
3. Test image file (JPEG/PNG/WebP)

## Getting a JWT Token

### 1. Create an account (if needed)

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

$token = $response.token
Write-Host "Token: $token"
```

### 2. Or login to existing account

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123"}'

$token = $response.token
Write-Host "Token: $token"
```

### 3. Store token for reuse

```powershell
$env:JWT_TOKEN = $token
```

## Receipt Endpoints

### Upload Receipt

**Endpoint:** `POST /rooms/:roomId/purchases/:purchaseId/receipt`

```powershell
# Set your IDs
$roomId = "your-room-id-here"
$purchaseId = "your-purchase-id-here"
$imagePath = "C:\path\to\receipt.jpg"

# Upload using Invoke-RestMethod (PowerShell native)
$response = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Method POST `
  -Headers @{Authorization="Bearer $env:JWT_TOKEN"} `
  -Form @{file=Get-Item $imagePath}

$response | ConvertTo-Json -Depth 10
```

**Expected Response (201 Created):**

```json
{
  "message": "Receipt uploaded successfully",
  "receipt": {
    "id": "rec_xyz123",
    "purchaseId": "pur_abc456",
    "url": "/rooms/room_123/purchases/pur_abc456/receipt/file",
    "originalFilename": "grocery_receipt.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 245678,
    "createdAt": "2026-01-28T12:00:00.000Z"
  }
}
```

### Get Receipt Metadata

**Endpoint:** `GET /rooms/:roomId/purchases/:purchaseId/receipt`

```powershell
$roomId = "your-room-id-here"
$purchaseId = "your-purchase-id-here"

$response = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Method GET `
  -Headers @{Authorization="Bearer $env:JWT_TOKEN"}

$response | ConvertTo-Json -Depth 10
```

**Expected Response (200 OK):**

```json
{
  "receipt": {
    "id": "rec_xyz123",
    "purchaseId": "pur_abc456",
    "url": "/rooms/room_123/purchases/pur_abc456/receipt/file",
    "originalFilename": "grocery_receipt.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 245678,
    "createdAt": "2026-01-28T12:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "message": "No receipt found for this purchase"
}
```

### Download Receipt File

**Endpoint:** `GET /rooms/:roomId/purchases/:purchaseId/receipt/file`

```powershell
$roomId = "your-room-id-here"
$purchaseId = "your-purchase-id-here"
$outputPath = "C:\path\to\downloaded_receipt.jpg"

Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt/file" `
  -Method GET `
  -Headers @{Authorization="Bearer $env:JWT_TOKEN"} `
  -OutFile $outputPath

Write-Host "Receipt downloaded to: $outputPath"
```

### Delete Receipt

**Endpoint:** `DELETE /rooms/:roomId/purchases/:purchaseId/receipt`

```powershell
$roomId = "your-room-id-here"
$purchaseId = "your-purchase-id-here"

$response = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $env:JWT_TOKEN"}

$response
```

**Expected Response (200 OK):**

```json
{
  "message": "Receipt deleted successfully"
}
```

## Error Responses

### 401 Unauthorized (No Token)

```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden (Not Room Member)

```json
{
  "message": "Not a member of this room"
}
```

### 404 Not Found (Purchase Not Found)

```json
{
  "message": "Purchase not found"
}
```

### 400 Bad Request (Invalid File Type)

```json
{
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
}
```

### 400 Bad Request (File Too Large)

```json
{
  "message": "File too large. Maximum size is 5MB."
}
```

## Complete Test Workflow

```powershell
# 1. Login
$response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123"}'

$token = $response.token
$env:JWT_TOKEN = $token

# 2. Get your rooms
$rooms = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms" `
  -Headers @{Authorization="Bearer $token"}

$roomId = $rooms.rooms[0].id
Write-Host "Using room: $roomId"

# 3. Get purchases in room
$purchases = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases" `
  -Headers @{Authorization="Bearer $token"}

$purchaseId = $purchases.purchases[0].id
Write-Host "Using purchase: $purchaseId"

# 4. Upload receipt
$imagePath = "C:\path\to\test_receipt.jpg"
$uploadResponse = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Form @{file=Get-Item $imagePath}

Write-Host "Upload successful!"
$uploadResponse | ConvertTo-Json

# 5. Get receipt metadata
$receiptMetadata = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Headers @{Authorization="Bearer $token"}

Write-Host "Receipt metadata:"
$receiptMetadata | ConvertTo-Json

# 6. Download receipt file
$downloadPath = "C:\temp\downloaded_receipt.jpg"
Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt/file" `
  -Headers @{Authorization="Bearer $token"} `
  -OutFile $downloadPath

Write-Host "Downloaded to: $downloadPath"

# 7. Delete receipt
$deleteResponse = Invoke-RestMethod `
  -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"}

Write-Host "Delete successful: $($deleteResponse.message)"
```

## Testing File Validation

### Test File Too Large (>5MB)

```powershell
# Create a large test file (6MB)
$largePath = "C:\temp\large_receipt.jpg"
$bytes = New-Object byte[] (6 * 1024 * 1024)
[System.IO.File]::WriteAllBytes($largePath, $bytes)

# Try to upload (should fail)
try {
  Invoke-RestMethod `
    -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
    -Method POST `
    -Headers @{Authorization="Bearer $token"} `
    -Form @{file=Get-Item $largePath}
} catch {
  Write-Host "Expected error: $($_.Exception.Message)"
}
```

### Test Invalid File Type (PDF)

```powershell
# Try to upload a PDF (should fail)
$pdfPath = "C:\path\to\document.pdf"

try {
  Invoke-RestMethod `
    -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
    -Method POST `
    -Headers @{Authorization="Bearer $token"} `
    -Form @{file=Get-Item $pdfPath}
} catch {
  Write-Host "Expected error: $($_.Exception.Message)"
}
```

## Using curl (if installed)

If you have curl.exe installed (Windows 10+ includes it):

### Upload

```powershell
curl.exe -X POST "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -H "Authorization: Bearer $env:JWT_TOKEN" `
  -F "file=@C:\path\to\receipt.jpg"
```

### Get Metadata

```powershell
curl.exe "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -H "Authorization: Bearer $env:JWT_TOKEN"
```

### Download File

```powershell
curl.exe "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt/file" `
  -H "Authorization: Bearer $env:JWT_TOKEN" `
  -o downloaded_receipt.jpg
```

### Delete

```powershell
curl.exe -X DELETE "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt" `
  -H "Authorization: Bearer $env:JWT_TOKEN"
```

## Security Testing

### Test Without Auth (Should Fail with 401)

```powershell
try {
  Invoke-RestMethod `
    -Uri "http://localhost:3001/rooms/$roomId/purchases/$purchaseId/receipt"
} catch {
  $_.Exception.Response.StatusCode  # Should be 401
}
```

### Test Wrong Room (Should Fail with 403 or 404)

```powershell
$wrongRoomId = "wrong-room-id"

try {
  Invoke-RestMethod `
    -Uri "http://localhost:3001/rooms/$wrongRoomId/purchases/$purchaseId/receipt" `
    -Headers @{Authorization="Bearer $token"}
} catch {
  Write-Host "Expected error: Not authorized"
}
```

### Test Pending Member (Should Fail with 403)

This requires manually setting a membership to 'pending' status in the database, then trying to access receipts.
