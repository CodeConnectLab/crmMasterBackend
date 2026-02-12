# Design Document

## Overview

This design addresses the MongoDB duplicate key error by updating the unique index to include `leadFormId` and modifying the account creation logic to handle multiple lead forms per page.

## Architecture Changes

### 1. Database Schema Update

**Current Index:**
```javascript
{ companyId: 1, pageId: 1 } // unique
```

**New Index:**
```javascript
{ companyId: 1, pageId: 1, leadFormId: 1 } // unique
```

### 2. Model Changes

**File:** `server/api/thirdParty/facebookAccount.model.js`

- Update the unique index definition
- Ensure `leadFormId` is included in the compound index
- Keep `verifyToken` index unchanged

### 3. Service Logic Changes

**File:** `server/api/thirdParty/facebook.service.js`

**Function:** `processSimpleAccount`

Current flow:
```
For each page:
  For each leadForm:
    Create FacebookAccount (companyId, pageId, leadFormId)
    // Fails on second leadForm due to duplicate pageId
```

Updated flow:
```
For each page:
  For each leadForm:
    Check if account exists (companyId, pageId, leadFormId)
    If not exists:
      Create FacebookAccount
    Else:
      Skip and log
```

### 4. Migration Script

**File:** `server/migrations/fix-facebook-account-index.js`

Steps:
1. Connect to database
2. Check if old index exists
3. Drop old index if exists
4. Check if new index exists
5. Create new index if not exists
6. Verify migration success

## Implementation Plan

### Phase 1: Create Migration Script
- Create migration file
- Add index drop/create logic
- Add error handling

### Phase 2: Update Model
- Modify facebookAccount.model.js
- Update index definition

### Phase 3: Update Service Logic
- Modify processSimpleAccount function
- Add existence check before creation
- Add proper error handling

### Phase 4: Testing
- Test with single lead form
- Test with multiple lead forms on same page
- Test with existing data
- Test migration script

## Data Flow

```
Facebook OAuth Callback
    ↓
Create FacebookSimpleAccount (temporary)
    ↓
processSimpleAccount()
    ↓
For each page → For each leadForm
    ↓
Check: Does FacebookAccount exist?
    ↓
    ├─ Yes → Skip (log info)
    └─ No → Create new FacebookAccount
```

## Error Handling

1. **Duplicate Key Error**: Should not occur after fix, but log if it does
2. **Missing leadFormId**: Log warning and skip that form
3. **Migration Errors**: Log detailed error and exit gracefully
4. **Network Errors**: Retry with exponential backoff

## Backward Compatibility

- Existing FacebookAccount documents remain functional
- Webhook subscriptions continue working
- No changes required to frontend
- No changes required to webhook handling logic

## Rollback Plan

If issues occur:
1. Stop the application
2. Restore old index: `db.facebookaccounts.createIndex({ companyId: 1, pageId: 1 }, { unique: true })`
3. Remove new index: `db.facebookaccounts.dropIndex({ companyId: 1, pageId: 1, leadFormId: 1 })`
4. Revert code changes
5. Restart application
