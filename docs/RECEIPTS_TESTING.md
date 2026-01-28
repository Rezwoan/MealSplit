# Receipt Upload Testing Guide

## Feature Overview
The receipt upload feature allows users to attach image receipts (JPEG, PNG, WebP) to purchases. Each purchase can have one receipt attached.

## Prerequisites
1. API server running on port 3001
2. Frontend running on port 5173
3. Database migration 0005_receipts.sql imported
4. `uploads/receipts/` directory exists in api folder
5. @fastify/static package installed

## Manual Testing Steps

### 1. Setup
```bash
# Ensure database migration is imported
# Import api/drizzle/0005_receipts.sql in phpMyAdmin or MySQL Workbench

# Verify uploads directory exists
cd e:\MealSplit\api
if not exist uploads\receipts mkdir uploads\receipts

# Start API
cd e:\MealSplit\api
npm run dev

# Start Frontend (in new terminal)
cd e:\MealSplit\web
npm run dev
```

### 2. Test Receipt Upload
1. Navigate to http://localhost:5173
2. Login with your account
3. Select a room
4. Go to the **Purchases** tab
5. Click on any existing purchase to open details modal
6. In the "Receipt" section, you should see:
   - Upload area with "Click to upload receipt" text
   - File type indicator: "JPEG, PNG, or WebP up to 5MB"

7. Click the upload area and select an image file (test with):
   - ✅ Valid JPEG (< 5MB)
   - ✅ Valid PNG (< 5MB)
   - ✅ Valid WebP (< 5MB)
   - ❌ PDF file (should show error: "Only JPEG, PNG, and WebP images are allowed")
   - ❌ Large file > 5MB (should show error: "File size must be less than 5MB")

8. After successful upload, verify:
   - Thumbnail preview appears (64x64 rounded image)
   - Filename is displayed
   - File size and upload date shown
   - "View Full Image" button available
   - "Replace" button available
   - Red trash icon for deletion

9. Close the modal and check purchases list:
   - Purchase should now show blue paperclip icon 📎
   - Icon indicates receipt is attached

### 3. Test View Receipt
1. Click on purchase with receipt
2. In details modal, click "View Full Image" button
3. Verify:
   - Full-screen modal opens with black overlay
   - Receipt image displayed at full resolution
   - X button in top-right to close
   - Clicking outside image closes modal
   - Image doesn't close when clicking on it

### 4. Test Replace Receipt
1. Open purchase with receipt
2. Click "Replace" button
3. Select a different image
4. Verify:
   - Upload progress indicator shows
   - Old receipt is replaced
   - New thumbnail appears
   - Filename updates
   - File size updates
   - Old file is deleted from server

### 5. Test Delete Receipt
1. Open purchase with receipt
2. Click red trash icon
3. Confirm deletion in browser dialog
4. Verify:
   - Receipt removed from modal
   - Upload area reappears
   - Paperclip icon removed from purchases list
   - File deleted from `api/uploads/receipts/` folder

### 6. Test Room Permissions
1. Try accessing receipt via direct API call for purchase in room you're NOT a member of
2. Should receive 403 Forbidden error

## API Endpoints Reference

### Upload Receipt
```bash
POST /rooms/:roomId/purchases/:purchaseId/receipt
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Example with curl
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/receipt.jpg" \
  http://localhost:3001/rooms/ROOM_ID/purchases/PURCHASE_ID/receipt
```

**Response 201 Created:**
```json
{
  "message": "Receipt uploaded successfully",
  "receipt": {
    "id": "rec_xyz123",
    "purchaseId": "pur_abc456",
    "filePath": "uploads/receipts/receipt_pur_abc456_1704067200000.jpg",
    "originalFilename": "grocery_receipt.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 245678,
    "uploadedByUserId": "usr_123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "publicUrl": "/uploads/receipts/receipt_pur_abc456_1704067200000.jpg"
  }
}
```

### Get Receipt Metadata
```bash
GET /rooms/:roomId/purchases/:purchaseId/receipt
Authorization: Bearer <token>

# Example
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/rooms/ROOM_ID/purchases/PURCHASE_ID/receipt
```

**Response 200 OK:**
```json
{
  "id": "rec_xyz123",
  "purchaseId": "pur_abc456",
  "filePath": "uploads/receipts/receipt_pur_abc456_1704067200000.jpg",
  "originalFilename": "grocery_receipt.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 245678,
  "uploadedByUserId": "usr_123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "publicUrl": "/uploads/receipts/receipt_pur_abc456_1704067200000.jpg"
}
```

**Response 404 Not Found:**
```json
{
  "message": "Receipt not found"
}
```

### Delete Receipt
```bash
DELETE /rooms/:roomId/purchases/:purchaseId/receipt
Authorization: Bearer <token>

# Example
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/rooms/ROOM_ID/purchases/PURCHASE_ID/receipt
```

**Response 200 OK:**
```json
{
  "message": "Receipt deleted successfully"
}
```

### View Receipt File
```bash
GET /uploads/receipts/<filename>

# Example
curl http://localhost:3001/uploads/receipts/receipt_pur_abc456_1704067200000.jpg --output receipt.jpg
```

## Error Cases to Test

| Scenario | Expected Error |
|----------|----------------|
| Upload without authentication | 401 Unauthorized |
| Upload to non-existent purchase | 404 Purchase not found |
| Upload to purchase in different room | 404 Purchase not found |
| Upload to room you're not member of | 403 Forbidden |
| Upload PDF file | 400 Invalid file type |
| Upload 6MB image | 400 File too large |
| Get receipt for purchase without receipt | 404 Receipt not found |
| Delete receipt from purchase without receipt | 404 Receipt not found |

## File Storage Details

### File Naming Convention
```
receipt_<purchaseId>_<timestamp>.<ext>

Examples:
- receipt_pur_abc123_1704067200000.jpg
- receipt_pur_xyz789_1704070800000.png
```

### Storage Location
```
api/uploads/receipts/
```

### File Constraints
- **Max Size:** 5MB
- **Allowed Types:** JPEG, PNG, WebP
- **Naming:** Sanitized filename with purchase ID and timestamp
- **Uniqueness:** One receipt per purchase (unique constraint on purchase_id)

## Database Schema

```sql
CREATE TABLE purchase_receipts (
  id VARCHAR(36) PRIMARY KEY,
  purchase_id VARCHAR(36) UNIQUE NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  file_size_bytes INT NOT NULL,
  uploaded_by_user_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Known Limitations
1. **No OCR:** Receipt images are stored as-is, no text extraction
2. **No line items:** Cannot parse individual items from receipt
3. **One receipt per purchase:** Cannot attach multiple receipts
4. **Local storage only:** Files stored on server filesystem (no S3/cloud)
5. **No image compression:** Original files stored without optimization
6. **No rotation/editing:** Images displayed as uploaded

## Future Enhancements (Out of MVP Scope)
- [ ] OCR integration for automatic amount extraction
- [ ] Line-item parsing
- [ ] Multiple receipts per purchase
- [ ] Image compression/optimization
- [ ] Cloud storage (S3) support
- [ ] Receipt templates by category
- [ ] Auto-create purchase from receipt photo
- [ ] Receipt thumbnail generation
- [ ] Image rotation/editing tools

## Troubleshooting

### Issue: Upload fails with "Failed to upload receipt"
**Solutions:**
1. Check `uploads/receipts/` directory exists and is writable
2. Verify @fastify/static is installed: `npm list @fastify/static`
3. Check API logs for detailed error message
4. Verify file size < 5MB
5. Ensure file type is JPEG/PNG/WebP

### Issue: Receipt not displaying in modal
**Solutions:**
1. Check browser console for 404 errors
2. Verify file exists in `api/uploads/receipts/`
3. Check PUBLIC_BASE_URL environment variable
4. Verify @fastify/static is registered in app.ts

### Issue: Paperclip icon not showing in purchases list
**Solutions:**
1. Refresh the purchases page
2. Check if receipt actually uploaded (check database + filesystem)
3. Verify getReceipt API call succeeds (browser Network tab)

### Issue: "Address already in use" when starting API
**Solutions:**
1. Find process: `netstat -ano | findstr :3001`
2. Kill process: `taskkill /PID <pid> /F`
3. Or use different port in .env: `PORT=3002`
