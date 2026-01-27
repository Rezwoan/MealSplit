# AUTH Flow Test Guide

This document provides curl commands and expected responses for testing the authentication system.

## Prerequisites
- API running at http://localhost:3001
- MySQL database set up with migrations imported
- Fresh database or known test accounts

## Test Commands (PowerShell)

### 1. Test Root Endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/"
```

**Expected Response:**
```json
{
  "ok": true,
  "name": "MealSplit API",
  "health": "/health",
  "docs": "https://github.com/Rezwoan/MealSplit"
}
```

---

### 2. Successful Signup
```powershell
$body = @{
  displayName = "Alice Johnson"
  email = "alice@example.com"
  password = "securepass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" -Method POST -ContentType "application/json" -Body $body
```

**Expected Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "displayName": "Alice Johnson"
  }
}
```

---

### 3. Duplicate Email Signup (409 Conflict)
```powershell
# Try to signup with same email again
$body = @{
  displayName = "Alice Smith"
  email = "alice@example.com"
  password = "differentpass"
} | ConvertTo-Json

try {
  Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" -Method POST -ContentType "application/json" -Body $body
} catch {
  $_.Exception.Response | ConvertFrom-Json
}
```

**Expected Response (409):**
```json
{
  "message": "Email already in use"
}
```

---

### 4. Invalid Signup Request (400 Bad Request)
```powershell
# Missing required field
$body = @{
  email = "bob@example.com"
  password = "test123"
} | ConvertTo-Json

try {
  Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" -Method POST -ContentType "application/json" -Body $body
} catch {
  Write-Host "Error: $_"
}
```

**Expected Response (400):**
```json
{
  "message": "Invalid request",
  "issues": {
    "fieldErrors": {
      "displayName": ["Required"]
    }
  }
}
```

---

### 5. Successful Login
```powershell
$body = @{
  email = "alice@example.com"
  password = "securepass123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $response.token
Write-Host "Token: $token"
```

**Expected Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "displayName": "Alice Johnson"
  }
}
```

---

### 6. Bad Login - Wrong Password (401 Unauthorized)
```powershell
$body = @{
  email = "alice@example.com"
  password = "wrongpassword"
} | ConvertTo-Json

try {
  Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $body
} catch {
  Write-Host "Error: Invalid email or password"
}
```

**Expected Response (401):**
```json
{
  "message": "Invalid email or password"
}
```

---

### 7. Bad Login - Non-existent User (401 Unauthorized)
```powershell
$body = @{
  email = "nonexistent@example.com"
  password = "somepassword"
} | ConvertTo-Json

try {
  Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $body
} catch {
  Write-Host "Error: Invalid email or password"
}
```

**Expected Response (401):**
```json
{
  "message": "Invalid email or password"
}
```

---

### 8. GET /me - Success
```powershell
# Use token from previous login
$headers = @{
  Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3001/me" -Headers $headers
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "displayName": "Alice Johnson"
  }
}
```

---

### 9. GET /me - No Token (401 Unauthorized)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3001/me"
} catch {
  Write-Host "Error: Unauthorized"
}
```

**Expected Response (401):**
```json
{
  "message": "Unauthorized"
}
```

---

### 10. GET /me - Invalid Token (401 Unauthorized)
```powershell
$headers = @{
  Authorization = "Bearer invalid.token.here"
}

try {
  Invoke-RestMethod -Uri "http://localhost:3001/me" -Headers $headers
} catch {
  Write-Host "Error: Unauthorized"
}
```

**Expected Response (401):**
```json
{
  "message": "Unauthorized"
}
```

---

## Web UI Testing

### Signup Flow
1. Navigate to http://localhost:5173/signup
2. Fill in:
   - Display name: `Test User`
   - Email: `testuser@example.com`
   - Password: `password123` (min 8 chars)
3. Click **"Create account"**
4. Should redirect to `/rooms` with token stored
5. Verify token: `localStorage.getItem('token')` in browser console

### Login Flow
1. Navigate to http://localhost:5173/login
2. Fill in:
   - Email: `testuser@example.com`
   - Password: `password123`
3. Click **"Sign in"**
4. Should redirect to `/rooms`

### Error Messages
- **Duplicate email**: "Email already in use"
- **Wrong password**: "Invalid email or password"
- **Invalid format**: Form validation (browser native)
- **Network error**: Check if API is running

---

## Complete Test Sequence

Run this script to test the full auth flow:

```powershell
# 1. Test root
Write-Host "1. Testing root endpoint..."
Invoke-RestMethod -Uri "http://localhost:3001/" | Out-Null
Write-Host "✓ Root endpoint OK"

# 2. Signup new user
Write-Host "`n2. Creating new account..."
$signupBody = @{
  displayName = "Test User $(Get-Random)"
  email = "test$(Get-Random)@example.com"
  password = "testpass123"
} | ConvertTo-Json

$signupResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/signup" -Method POST -ContentType "application/json" -Body $signupBody
$testEmail = ($signupBody | ConvertFrom-Json).email
Write-Host "✓ Signup successful - Email: $testEmail"

# 3. Login with created user
Write-Host "`n3. Logging in..."
$loginBody = @{
  email = $testEmail
  password = "testpass123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.token
Write-Host "✓ Login successful - Token received"

# 4. Test /me with token
Write-Host "`n4. Testing /me endpoint..."
$headers = @{
  Authorization = "Bearer $token"
}
$meResponse = Invoke-RestMethod -Uri "http://localhost:3001/me" -Headers $headers
Write-Host "✓ /me successful - User: $($meResponse.user.displayName)"

Write-Host "`n🎉 All auth tests passed!"
```

---

## Sanity Check

**Expected Behavior:**
1. ✅ Can create new account with valid data
2. ✅ Cannot create duplicate account (same email)
3. ✅ Can login with correct credentials
4. ✅ Cannot login with wrong password
5. ✅ Can access `/me` with valid token
6. ✅ Cannot access `/me` without token
7. ✅ Web UI shows proper error messages
8. ✅ Web UI redirects to `/rooms` after successful signup/login
9. ✅ Token is stored in localStorage
10. ✅ Logging out clears token and prevents access to protected routes

---

## Troubleshooting

**"Unable to connect to the remote server"**
- API not running - Start with `npm run dev` in `/api`

**"Database connection failed"**
- MySQL not running - Start MySQL service
- Check credentials in `api/.env`

**"Internal server error"**
- Check API terminal for detailed error logs
- Verify all migrations are imported

**"CORS error" in browser**
- Verify `CORS_ORIGIN` in `.env` matches web URL
- Should be `http://localhost:5173`
