# Invoicer API Documentation (Detailed)

This document provides a step-by-step guide to the Invoicer API. All endpoints return JSON and expect `Content-Type: application/json` for POST requests.

## Base URL
`https://invoicerapi.inzeedo.com/api`

---

## 1. Authentication & Identity

### POST `/register`
Registers a new user and initiates dual-verification (Email & Mobile).

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Mandatory** | Full name of the user. |
| `email` | String | **Mandatory** | Unique email address. |
| `mobile` | String | **Mandatory** | Unique mobile number (e.g., +94771234567). |
| `password` | String | **Mandatory** | Minimum 6 characters. |

**Do NOT include:** `role`, `isEmailVerified`, `isMobileVerified`, `subscription`, `usage`.

**Example Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+94771234567",
  "password": "securepassword123"
}
```

**Example Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered. Please verify your email and mobile.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6584...",
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "+94771234567",
    "isEmailVerified": false,
    "isMobileVerified": false,
    "subscription": {
      "plan": "basic",
      "status": "active",
      "invoicesLimit": 50,
      "invoicesUsed": 0
    }
  }
}
```

---

### POST `/login`
Authenticates a user and returns a JWT token.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Mandatory** | Registered email address. |
| `password` | String | **Mandatory** | User's password. |

**Example Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6584...",
    "name": "John Doe",
    "email": "john@example.com",
    "isEmailVerified": true,
    "isMobileVerified": true,
    "subscription": { ... }
  }
}
```

---

### GET `/me`
Fetches the latest profile data for the authenticated user. Use this to refresh verification status or usage stats.

**Headers:**
- `Authorization: Bearer <token>` (**Mandatory**)

**Example Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "6584...",
    "isEmailVerified": true,
    "isMobileVerified": true,
    "subscription": {
      "plan": "pro",
      "invoicesLimit": 500,
      "invoicesUsed": 45
    }
  }
}
```

---

## 2. Account Verification

### POST `/verify-account`
Verifies the 6-digit OTP sent to email or mobile.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Mandatory** | User's email address. |
| `otp` | String | **Mandatory** | 6-digit verification code. |
| `type` | String | **Mandatory** | Either `"email"` or `"mobile"`. |

**Example Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "type": "email"
}
```

---

### POST `/resend-verification-otp`
Requests a new verification code if the previous one was not received.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Mandatory** | User's email address. |
| `type` | String | **Mandatory** | Either `"email"` or `"mobile"`. |

---

## 3. Password Management

### POST `/forgot-password`
Initiates password reset.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Mandatory** | User's email address. |
| `platform` | String | **Mandatory** | `"mobile"` (sends OTP) or `"web"` (sends link). |

---

### POST `/verify-reset-otp`
Verifies the password reset OTP (Mobile flow).

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | **Mandatory** | User's email address. |
| `otp` | String | **Mandatory** | 6-digit code from email. |

**Example Response (200 OK):**
```json
{
  "success": true,
  "resetToken": "7f8a9b..." // Use this in /reset-password
}
```

---

### POST `/reset-password`
Sets a new password using the reset token.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `token` | String | **Mandatory** | The `resetToken` received from verification. |
| `password` | String | **Mandatory** | New password. |

---

## 4. Subscription & Plans

### GET `/plan`
Returns current usage and all available plans.

**Headers:**
- `Authorization: Bearer <token>` (**Mandatory**)

**Example Response:**
```json
{
  "success": true,
  "subscription": {
    "plan": "basic",
    "invoicesLimit": 50,
    "invoicesUsed": 10
  },
  "availablePlans": [
    { "id": "basic", "name": "Basic", "price": 0 },
    { "id": "pro", "name": "Pro", "price": 9.99 }
  ]
}
```

---

## 5. Invoices & Operations

### POST `/invoice/generate`
Call this endpoint **before** generating a PDF to check limits and increment usage.

**Headers:**
- `Authorization: Bearer <token>` (**Mandatory**)

**Example Response (200 OK):**
```json
{
  "success": true,
  "invoicesUsed": 11,
  "remaining": 39
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "LIMIT_REACHED",
  "message": "You have reached your monthly invoice limit."
}
```

---

### POST `/download`
Generates an invoice email.

**Payload (Request Body):**
| Field | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `invoice` | Object | **Mandatory** | `{ "number": "INV-001", "date": "..." }` |
| `billTo` | Object | **Mandatory** | `{ "name": "...", "address": "..." }` |
| `yourCompany`| Object | **Mandatory** | `{ "name": "...", "phone": "..." }` |
| `items` | Array | **Mandatory** | List of items with `name`, `quantity`, `total`. |
| `grandTotal` | Number | **Mandatory** | Final amount. |
| `notes` | String | Optional | Additional notes for the invoice. |

---

## 6. Admin Endpoints

### POST `/admin/login`
Admin-only login. Returns a token with `role: 'admin'`.

**Payload:** `{ "email": "...", "password": "..." }`

---

### GET `/admin/users`
Lists all users with their plan and verification status.

**Headers:**
- `Authorization: Bearer <admin_token>` (**Mandatory**)

---

## 7. System & Utility

### GET `/health`
Check API and Database health.

**Headers:**
- `x-health-key` | String | Optional | Secret key for sensitive system info.

---

### GET `/version-check`
Check for app updates.

**Query Parameters:**
- `current` | String | Optional | Current version of the app (e.g., `1.0.0`).

**Example Response:**
```json
{
  "success": true,
  "data": {
    "updateAvailable": true,
    "latestVersion": "1.1.0",
    "forceUpdate": false,
    "downloadUrl": "..."
  }
}
```
