# Facebook Integration - Backend Documentation

## Overview

This document provides a comprehensive guide for the automated Facebook Lead Generation integration system. The system automatically processes Facebook accounts, subscribes to webhooks, and saves leads to the CRM.

## Architecture

The integration follows this flow:
1. **Simple Account Creation** → Frontend creates a simple account with basic Facebook app credentials
2. **Account Processing** → Backend automatically processes the account:
   - Exchanges short-lived token for long-lived (never expires)
   - Discovers all Facebook pages
   - Subscribes pages to webhooks
   - Creates full Facebook accounts
3. **Webhook Processing** → Facebook sends lead events → System saves leads automatically

## Models

### FacebookSimpleAccount Model
Stores initial account data from frontend before processing.

**Fields:**
- `companyId` (ObjectId, required) - Company reference
- `accountName` (String, required) - Account name
- `facebookAppId` (String, required) - Facebook App ID
- `facebookAppSecret` (String, required) - Facebook App Secret
- `webhookUrl` (String, required) - Webhook URL for receiving leads
- `verifyToken` (String, required) - Token for webhook verification (auto-generated)
- `userAccessToken` (String, required) - User access token from Facebook
- `processed` (Boolean, default: false) - Whether account has been processed
- `processedAt` (Date) - When account was processed
- `createdBy` (ObjectId) - User who created the account

### FacebookAccount Model
Stores fully processed Facebook account with page and form details.

**Fields:**
- `companyId` (ObjectId, required) - Company reference
- `accountName` (String, required) - Account name
- `facebookAppId` (String, required) - Facebook App ID
- `facebookAppSecret` (String, required) - Facebook App Secret
- `pageId` (String, required) - Facebook Page ID
- `pageAccessToken` (String, required) - Page access token (long-lived, never expires)
- `pageAccessTokenExpiry` (Date, optional) - Token expiry (null for long-lived tokens)
- `leadFormId` (String, required) - Lead form ID
- `webhookUrl` (String, required) - Webhook URL
- `verifyToken` (String, required) - Verification token
- `webhookSubscribed` (Boolean, default: false) - Webhook subscription status
- `webhookSubscribedAt` (Date) - When webhook was subscribed
- `pageName` (String) - Page name
- `isActive` (Boolean, default: true) - Account active status
- `leadSourceId` (ObjectId, optional) - Associated lead source
- `fieldMappings` (Map) - Field mapping configuration
- `totalLeadsReceived` (Number, default: 0) - Total leads count
- `lastWebhookReceived` (Date) - Last webhook received timestamp

## API Endpoints

### 1. Create Simple Account
**POST** `/api/v1/facebook/simple-account`

Creates a simple Facebook account that will be processed later.

**Authentication:** Required

**Request Body:**
```json
{
  "accountName": "My Facebook Account",
  "facebookAppId": "1234567890123456",
  "facebookAppSecret": "your_app_secret",
  "webhookUrl": "https://yourdomain.com/api/v1/facebook/webhook",
  "verifyToken": "optional_custom_token", // Optional, auto-generated if not provided
  "userAccessToken": "short_lived_user_token_from_facebook",
  "companyId": "67b2c739b9844cf70ce71233" // Optional, uses user's company if not provided
}
```

**Response:**
```json
{
  "error": false,
  "message": "Simple Facebook account created successfully!",
  "data": {
    "_id": "account_id",
    "companyId": "67b2c739b9844cf70ce71233",
    "accountName": "My Facebook Account",
    "facebookAppId": "1234567890123456",
    "webhookUrl": "https://yourdomain.com/api/v1/facebook/webhook",
    "verifyToken": "generated_token",
    "processed": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Process Simple Account
**POST** `/api/v1/facebook/process-account/:id`

Processes a simple account and creates full Facebook accounts for all pages and forms.

**Authentication:** Required

**URL Parameters:**
- `id` (ObjectId, required) - Simple account ID

**Response:**
```json
{
  "error": false,
  "message": "Facebook account processed successfully!",
  "data": {
    "success": true,
    "message": "Processed 3 Facebook account(s)",
    "accounts": [
      {
        "_id": "account_id",
        "pageId": "123456789",
        "pageName": "My Page",
        "leadFormId": "form_id",
        "webhookSubscribed": true
      }
    ]
  }
}
```

**What happens during processing:**
1. Exchanges short-lived user token for long-lived token (never expires)
2. Fetches all pages associated with the user
3. For each page with lead forms:
   - Subscribes page to webhook for leadgen events
   - Creates a FacebookAccount record
4. Marks simple account as processed

### 3. Get All Facebook Accounts
**GET** `/api/v1/facebook/accounts`

Retrieves all Facebook accounts for the user's company.

**Authentication:** Required

**Query Parameters:**
- `companyId` (ObjectId, optional) - Filter by company ID

**Response:**
```json
{
  "error": false,
  "message": "Facebook accounts retrieved successfully!",
  "data": [
    {
      "_id": "account_id",
      "accountName": "My Facebook Account - My Page - Lead Form",
      "pageId": "123456789",
      "pageName": "My Page",
      "leadFormId": "form_id",
      "webhookSubscribed": true,
      "isActive": true,
      "totalLeadsReceived": 42,
      "lastWebhookReceived": "2024-01-01T12:00:00.000Z",
      "leadSourceId": {
        "_id": "lead_source_id",
        "name": "Facebook Leads"
      }
    }
  ]
}
```

### 4. Update Facebook Account
**PUT** `/api/v1/facebook/accounts/:id`

Updates a Facebook account.

**Authentication:** Required

**URL Parameters:**
- `id` (ObjectId, required) - Facebook account ID

**Request Body:**
```json
{
  "leadSourceId": "67b9761e239b25980850a707", // Optional
  "isActive": true, // Optional
  "accountName": "Updated Account Name", // Optional
  "fieldMappings": { // Optional
    "email": "email",
    "phone_number": "contactNumber",
    "first_name": "firstName"
  }
}
```

**Response:**
```json
{
  "error": false,
  "message": "Facebook account updated successfully!",
  "data": {
    "_id": "account_id",
    "accountName": "Updated Account Name",
    "isActive": true,
    "leadSourceId": "67b9761e239b25980850a707"
  }
}
```

### 5. Delete Facebook Account
**DELETE** `/api/v1/facebook/accounts/:id`

Deletes a Facebook account.

**Authentication:** Required

**URL Parameters:**
- `id` (ObjectId, required) - Facebook account ID

**Response:**
```json
{
  "error": false,
  "message": "Facebook account deleted successfully!",
  "data": {
    "message": "Facebook account deleted successfully"
  }
}
```

### 6. Webhook Verification (GET)
**GET** `/api/v1/facebook/webhook`

Facebook calls this endpoint to verify the webhook during setup.

**Authentication:** Not required

**Query Parameters:**
- `hub.mode` - Must be "subscribe"
- `hub.verify_token` - Must match verifyToken in database
- `hub.challenge` - Challenge string from Facebook

**Response:**
- Returns `hub.challenge` if verification succeeds
- Returns `403 Forbidden` if verification fails

### 7. Webhook Receiver (POST)
**POST** `/api/v1/facebook/webhook`

Receives lead generation events from Facebook.

**Authentication:** Not required (Facebook verifies via verifyToken)

**Request Body (from Facebook):**
```json
{
  "object": "page",
  "entry": [
    {
      "id": "page_id",
      "time": 1234567890,
      "changes": [
        {
          "value": {
            "leadgen_id": "lead_id",
            "form_id": "form_id",
            "created_time": 1234567890
          },
          "field": "leadgen"
        }
      ]
    }
  ]
}
```

**Response:**
- Always returns `200 OK` immediately (processing happens asynchronously)

**What happens:**
1. System finds the Facebook account for the page and form
2. Fetches lead details from Facebook Graph API
3. Maps fields according to fieldMappings
4. Creates a lead in the Lead model with:
   - All Facebook lead data
   - `followUpDate` set to current time + 6 minutes
   - `leadAddType` set to "ThirdParty"
   - Campaign and ad information
5. Updates account statistics

## Lead Data Structure

When a lead is saved from Facebook webhook, it uses this structure:

```javascript
{
  fbLeadGenId: "leadgen_id",
  fbLeadGenFormId: "form_id",
  fbLeadGenAdId: "ad_id",
  companyId: "company_id",
  leadAddType: "ThirdParty",
  fbCompainName: "Form Name",
  campaignName: "Campaign Name",
  adName: "Ad Name",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  city: "New York",
  contactNumber: "+1234567890",
  description: "Lead generated from Facebook",
  followUpDate: new Date(Date.now() + 6 * 60 * 1000), // Current time + 6 minutes
  leadSource: "lead_source_id" // If configured
}
```

## Token Exchange Process

The system automatically exchanges short-lived tokens for long-lived tokens:

1. **Short-lived token** (from Facebook OAuth, expires in ~1-2 hours)
2. **Exchange API call** to Facebook Graph API:
   ```
   GET /oauth/access_token
   ?grant_type=fb_exchange_token
   &client_id={app_id}
   &client_secret={app_secret}
   &fb_exchange_token={short_lived_token}
   ```
3. **Long-lived token** (never expires, stored in database)

## Webhook Subscription Process

For each page with lead forms:

1. **Subscribe to leadgen events:**
   ```
   POST /{page_id}/subscribed_apps
   ?access_token={page_access_token}
   &subscribed_fields=leadgen
   ```

2. **Verify subscription status** and store in database

## Error Handling

The system includes comprehensive error handling:

- **Token exchange failures**: Logged and thrown with descriptive messages
- **Page fetch failures**: Logged, continues with next page
- **Webhook subscription failures**: Logged, account still created but marked as not subscribed
- **Lead processing failures**: Logged, webhook still returns 200 to Facebook
- **Duplicate leads**: Checked before saving, skipped if exists

## Environment Variables

No specific environment variables required. The system uses:
- `BASE_URL` (optional) - For webhook URLs
- Standard Node.js environment

## Facebook App Setup Requirements

To use this integration, you need:

1. **Facebook App** with:
   - App ID and App Secret
   - `pages_read_engagement` permission
   - `leads_retrieval` permission
   - `pages_manage_metadata` permission

2. **Webhook Configuration**:
   - Webhook URL: `https://yourdomain.com/api/v1/facebook/webhook`
   - Verify Token: Use the token from database
   - Subscribe to: `leadgen` field

3. **Page Access**:
   - User must grant access to pages
   - Pages must have lead forms configured

## Testing

### Test Webhook Verification
```bash
curl "https://yourdomain.com/api/v1/facebook/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

### Test Webhook Receiver
```bash
curl -X POST "https://yourdomain.com/api/v1/facebook/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "page_id",
      "time": 1234567890,
      "changes": [{
        "value": {
          "leadgen_id": "lead_id",
          "form_id": "form_id",
          "created_time": 1234567890
        },
        "field": "leadgen"
      }]
    }]
  }'
```

## Troubleshooting

### Account not processing
- Check if token is valid
- Verify app permissions
- Check logs for specific error messages

### Webhook not receiving leads
- Verify webhook URL is accessible
- Check verifyToken matches
- Ensure page is subscribed (check `webhookSubscribed` field)
- Verify Facebook app webhook configuration

### Leads not saving
- Check Facebook account is active (`isActive: true`)
- Verify lead form ID matches
- Check database connection
- Review error logs

## Logging

The system logs important events:
- 🔄 Token exchange
- 📄 Page fetching
- 🔔 Webhook subscription
- 📥 Lead processing
- ✅ Success operations
- ❌ Error operations

Check application logs for detailed information.
