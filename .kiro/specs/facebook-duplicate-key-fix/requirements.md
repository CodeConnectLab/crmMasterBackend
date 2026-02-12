# Requirements Document

## Introduction

This specification addresses a MongoDB duplicate key error that occurs when processing Facebook accounts with multiple lead forms on the same page. The current system attempts to create multiple `FacebookAccount` documents with the same `companyId` and `pageId` combination, which violates the unique compound index `{ companyId: 1, pageId: 1 }`. The root cause is a mismatch between the unique index definition (which doesn't include `leadFormId`) and the business logic (which attempts to create one account per lead form).

## Glossary

- **FacebookAccount**: A MongoDB document representing a Facebook page integration with lead form configuration
- **Company**: The organization that owns the Facebook integration
- **Page**: A Facebook page that contains one or more lead forms
- **Lead_Form**: A Facebook lead generation form attached to a page
- **Unique_Index**: A MongoDB index constraint that prevents duplicate documents based on specified fields
- **Simple_Account**: A temporary account record created during the initial Facebook OAuth flow, before processing
- **Process_Simple_Account**: The operation that converts a Simple_Account into one or more FacebookAccount documents

## Requirements

### Requirement 1: Support Multiple Lead Forms Per Page

**User Story:** As a system administrator, I want to support multiple lead forms on the same Facebook page, so that companies can capture leads from different forms independently.

#### Acceptance Criteria

1. WHEN a Facebook page has multiple lead forms, THE System SHALL create separate FacebookAccount documents for each lead form
2. WHEN creating FacebookAccount documents, THE System SHALL ensure each document has a unique combination of companyId, pageId, and leadFormId
3. WHEN querying for existing accounts, THE System SHALL check all three fields (companyId, pageId, leadFormId) to determine if an account already exists
4. WHEN receiving webhook events, THE System SHALL route leads to the correct FacebookAccount based on pageId and leadFormId

### Requirement 2: Fix Database Index Constraint

**User Story:** As a developer, I want the database index to match the business logic, so that the system doesn't throw duplicate key errors.

#### Acceptance Criteria

1. THE System SHALL define a unique compound index on { companyId: 1, pageId: 1, leadFormId: 1 }
2. WHEN the old index { companyId: 1, pageId: 1 } exists, THE System SHALL remove it before creating the new index
3. WHEN applying the new index, THE System SHALL handle existing data without causing errors
4. THE System SHALL maintain the verifyToken index for webhook verification

### Requirement 3: Update Account Creation Logic

**User Story:** As a developer, I want the account creation logic to prevent duplicate attempts, so that the system operates reliably.

#### Acceptance Criteria

1. WHEN checking for existing accounts in processSimpleAccount, THE System SHALL query using { companyId, pageId, leadFormId }
2. WHEN an account already exists for a given combination, THE System SHALL skip creation and log an informational message
3. WHEN creating a new account, THE System SHALL include all three fields (companyId, pageId, leadFormId) in the document
4. WHEN processing fails for one lead form, THE System SHALL continue processing remaining lead forms

### Requirement 4: Preserve Existing Data Integrity

**User Story:** As a system administrator, I want existing Facebook account data to remain functional after the fix, so that current integrations continue working.

#### Acceptance Criteria

1. WHEN the index migration runs, THE System SHALL preserve all existing FacebookAccount documents
2. IF duplicate documents exist with the same companyId and pageId but different leadFormId values, THE System SHALL keep all documents
3. WHEN the migration completes, THE System SHALL verify that all existing accounts remain queryable
4. THE System SHALL maintain backward compatibility with existing webhook subscriptions

### Requirement 5: Provide Migration Path

**User Story:** As a developer, I want a safe migration script, so that I can apply the fix to production without downtime.

#### Acceptance Criteria

1. THE System SHALL provide a migration script that drops the old index and creates the new index
2. WHEN the migration script runs, THE System SHALL check for the existence of the old index before attempting to drop it
3. WHEN the migration script runs, THE System SHALL check for the existence of the new index before attempting to create it
4. IF the migration encounters errors, THE System SHALL log detailed error messages and exit gracefully
5. THE Migration_Script SHALL be idempotent (safe to run multiple times)


---

## Implementation Status

### ✅ Completed

1. **Model Update** - `server/api/thirdParty/facebookAccount.model.js`
   - Updated unique index from `{ companyId, pageId }` to `{ companyId, pageId, leadFormId }`

2. **Service Logic** - `server/api/thirdParty/facebook.service.js`
   - Already has correct implementation
   - Checks for existing accounts using all three fields
   - Creates separate account for each lead form
   - Handles errors gracefully

3. **Migration Script** - `server/migrations/fix-facebook-account-index.js`
   - Drops old index
   - Creates new index
   - Idempotent and safe to run multiple times

4. **Verification Script** - `server/migrations/verify-facebook-accounts.js`
   - Checks index configuration
   - Finds duplicate accounts
   - Shows pages with multiple forms

5. **Documentation**
   - Implementation Guide (English)
   - Hindi Guide
   - Flow Diagrams
   - Task Checklist

### ⏳ Pending

1. **Testing**
   - Test on staging environment
   - Test with single lead form
   - Test with multiple lead forms
   - Test reconnection (idempotency)

2. **Deployment**
   - Backup production database
   - Run migration on production
   - Verify migration success
   - Monitor for 24 hours

## Files Created/Modified

### Created Files
- `.kiro/specs/facebook-duplicate-key-fix/design.md`
- `.kiro/specs/facebook-duplicate-key-fix/tasks.md`
- `.kiro/specs/facebook-duplicate-key-fix/IMPLEMENTATION_GUIDE.md`
- `.kiro/specs/facebook-duplicate-key-fix/HINDI_GUIDE.md`
- `.kiro/specs/facebook-duplicate-key-fix/FLOW_DIAGRAM.md`
- `server/migrations/fix-facebook-account-index.js`
- `server/migrations/verify-facebook-accounts.js`

### Modified Files
- `server/api/thirdParty/facebookAccount.model.js` - Updated index
- `package.json` - Added migration scripts

## Quick Start Commands

```bash
# Run migration
npm run migrate:facebook-index

# Verify migration
npm run verify:facebook-accounts

# Check logs
tail -f logs/$(date +%Y-%m-%d)/all-logs.log
```

## Success Criteria

✅ Migration runs without errors
✅ New index is created successfully
✅ Old index is removed
✅ Multiple lead forms per page can be added
✅ No duplicate key errors occur
✅ Existing accounts continue to work
✅ Leads are received and stored correctly
