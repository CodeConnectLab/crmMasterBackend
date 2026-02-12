# Facebook Lead Form Integration - Flow Diagram

## Current System Flow (After Fix)

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Connects Facebook Page                   │
│                  (OAuth Flow Completes)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Create FacebookSimpleAccount                        │
│              (Temporary record with user token)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  processSimpleAccount()                          │
│              Exchange for long-lived token                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Get User's Pages                              │
│              (Facebook Graph API call)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │  For Each Page  │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Get Lead Forms for Page                           │
│              (page.leadgen_forms.data)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────┴──────────┐
                  │  For Each Lead Form │
                  └──────────┬──────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Check if Account Already Exists                     │
│                                                                  │
│  Query: {                                                        │
│    companyId: simpleAccount.companyId,                          │
│    pageId: page.id,                                             │
│    leadFormId: form.id  ← IMPORTANT!                            │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │   Exists?    │   │  Not Exists? │
            │   Skip it    │   │  Create New  │
            └──────────────┘   └──────┬───────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Subscribe Page to Webhook                           │
│              (Facebook Graph API)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Create FacebookAccount Document                     │
│                                                                  │
│  {                                                               │
│    companyId: ...,                                              │
│    pageId: page.id,                                             │
│    leadFormId: form.id,  ← Unique combination                   │
│    pageAccessToken: ...,                                        │
│    webhookUrl: ...,                                             │
│    verifyToken: ...,                                            │
│    accountName: "Company - Page - Form"                         │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Mark SimpleAccount as Processed                     │
└─────────────────────────────────────────────────────────────────┘
```

## Example Scenario

### Scenario: ABC Company connects Facebook page with 3 lead forms

```
Company: ABC Ltd (companyId: 507f1f77bcf86cd799439011)
Page: ABC Marketing (pageId: 123456789)

Lead Forms:
  1. Contact Us Form (formId: form_001)
  2. Get Quote Form (formId: form_002)
  3. Newsletter Signup (formId: form_003)
```

### Database Records Created:

```javascript
// Account 1
{
  _id: ObjectId("..."),
  companyId: ObjectId("507f1f77bcf86cd799439011"),
  pageId: "123456789",
  leadFormId: "form_001",  // ← Unique
  accountName: "ABC Ltd - ABC Marketing - Contact Us Form",
  // ... other fields
}

// Account 2
{
  _id: ObjectId("..."),
  companyId: ObjectId("507f1f77bcf86cd799439011"),
  pageId: "123456789",  // Same page
  leadFormId: "form_002",  // ← Different form
  accountName: "ABC Ltd - ABC Marketing - Get Quote Form",
  // ... other fields
}

// Account 3
{
  _id: ObjectId("..."),
  companyId: ObjectId("507f1f77bcf86cd799439011"),
  pageId: "123456789",  // Same page
  leadFormId: "form_003",  // ← Different form
  accountName: "ABC Ltd - ABC Marketing - Newsletter Signup",
  // ... other fields
}
```

### Unique Index Ensures:

```
✅ companyId + pageId + leadFormId = Unique
❌ companyId + pageId (alone) = Not unique anymore
```

## Webhook Flow (When Lead is Submitted)

```
┌─────────────────────────────────────────────────────────────────┐
│              User Submits Lead on Facebook                       │
│              (Fills form on Facebook page)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Facebook Sends Webhook Event                        │
│                                                                  │
│  POST /api/facebook/webhook                                      │
│  {                                                               │
│    entry: [{                                                     │
│      changes: [{                                                 │
│        value: {                                                  │
│          page_id: "123456789",                                  │
│          leadgen_id: "lead_12345",                              │
│          form_id: "form_001"  ← Identifies which form           │
│        }                                                         │
│      }]                                                          │
│    }]                                                            │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Find Correct FacebookAccount                        │
│                                                                  │
│  Query: {                                                        │
│    pageId: "123456789",                                         │
│    leadFormId: "form_001"  ← Routes to correct account          │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fetch Lead Details from Facebook                    │
│              (Using pageAccessToken from account)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Create Lead in CRM Database                         │
│              (Map fields, assign to lead source)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Index Structure

### Old Index (Caused Problems):
```javascript
{
  companyId: 1,
  pageId: 1
}
// unique: true

// Problem: Can't have multiple forms per page
```

### New Index (Solution):
```javascript
{
  companyId: 1,
  pageId: 1,
  leadFormId: 1
}
// unique: true

// Solution: Each form gets its own account
```

## Migration Process

```
┌─────────────────────────────────────────────────────────────────┐
│              Run Migration Script                                │
│              npm run migrate:facebook-index                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Connect to MongoDB                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Check if Old Index Exists                           │
│              (companyId_1_pageId_1)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │   Exists?    │   │  Not Exists? │
            │   Drop it    │   │  Skip drop   │
            └──────┬───────┘   └──────┬───────┘
                   │                  │
                   └────────┬─────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Check if New Index Exists                           │
│              (companyId_1_pageId_1_leadFormId_1)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │   Exists?    │   │  Not Exists? │
            │  Skip create │   │  Create it   │
            └──────────────┘   └──────┬───────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Verify Migration Success                            │
│              Show final index state                              │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│              Processing Lead Form                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │  Try to Create  │
                    │    Account      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │   Success?   │   │    Error?    │
            │   Continue   │   │  Log & Skip  │
            └──────────────┘   └──────┬───────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Continue with Next Form                             │
│              (Don't stop entire process)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Points

1. **One Page, Multiple Forms** = Multiple Accounts ✅
2. **Unique Combination** = companyId + pageId + leadFormId
3. **Idempotent** = Can reconnect same page without duplicates
4. **Error Resilient** = One form fails, others continue
5. **Backward Compatible** = Existing accounts still work
