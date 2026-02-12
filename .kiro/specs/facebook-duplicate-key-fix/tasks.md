# Implementation Tasks

## Task 1: Create Migration Script
**Status:** Pending
**Priority:** High
**Estimated Time:** 30 minutes

### Description
Create a migration script to update the database index from `{ companyId, pageId }` to `{ companyId, pageId, leadFormId }`.

### Steps
1. Create file: `server/migrations/fix-facebook-account-index.js`
2. Add database connection logic
3. Add index drop logic (with existence check)
4. Add index create logic (with existence check)
5. Add error handling and logging
6. Make script idempotent

### Acceptance Criteria
- [ ] Script can be run multiple times safely
- [ ] Old index is dropped if it exists
- [ ] New index is created if it doesn't exist
- [ ] Detailed logs are provided
- [ ] Errors are handled gracefully

---

## Task 2: Update FacebookAccount Model
**Status:** Pending
**Priority:** High
**Estimated Time:** 15 minutes

### Description
Update the model to use the new compound unique index.

### Steps
1. Open `server/api/thirdParty/facebookAccount.model.js`
2. Locate the index definition
3. Update from `{ companyId: 1, pageId: 1 }` to `{ companyId: 1, pageId: 1, leadFormId: 1 }`
4. Verify verifyToken index remains unchanged

### Acceptance Criteria
- [ ] Index includes all three fields
- [ ] Index is marked as unique
- [ ] Other indexes remain unchanged
- [ ] Model validation rules remain unchanged

---

## Task 3: Update processSimpleAccount Logic
**Status:** Pending
**Priority:** High
**Estimated Time:** 45 minutes

### Description
Modify the account creation logic to check for existing accounts using all three fields.

### Steps
1. Open `server/api/thirdParty/facebook.service.js`
2. Locate `processSimpleAccount` function
3. Update the existence check query to include `leadFormId`
4. Add skip logic when account already exists
5. Add informational logging
6. Add error handling for individual lead form failures

### Acceptance Criteria
- [ ] Query checks companyId, pageId, and leadFormId
- [ ] Existing accounts are not recreated
- [ ] New accounts are created successfully
- [ ] Errors in one lead form don't stop processing of others
- [ ] Appropriate logs are generated

---

## Task 4: Run Migration Script
**Status:** Pending
**Priority:** High
**Estimated Time:** 10 minutes

### Description
Execute the migration script on the database.

### Steps
1. Backup the database (recommended)
2. Run migration script: `node server/migrations/fix-facebook-account-index.js`
3. Verify old index is dropped
4. Verify new index is created
5. Check for any errors in logs

### Acceptance Criteria
- [ ] Migration completes without errors
- [ ] Old index no longer exists
- [ ] New index exists and is unique
- [ ] Existing data remains intact

---

## Task 5: Test with Single Lead Form
**Status:** Pending
**Priority:** Medium
**Estimated Time:** 20 minutes

### Description
Test the updated system with a Facebook page that has one lead form.

### Steps
1. Connect a Facebook page with one lead form
2. Verify FacebookAccount is created
3. Check database for correct document structure
4. Verify webhook subscription works
5. Test lead submission

### Acceptance Criteria
- [ ] Account is created successfully
- [ ] All three fields are populated
- [ ] Webhook receives lead data
- [ ] Lead is stored in database

---

## Task 6: Test with Multiple Lead Forms
**Status:** Pending
**Priority:** High
**Estimated Time:** 30 minutes

### Description
Test the updated system with a Facebook page that has multiple lead forms.

### Steps
1. Connect a Facebook page with 2+ lead forms
2. Verify separate FacebookAccount is created for each form
3. Check database for multiple documents with same pageId
4. Verify each account has unique leadFormId
5. Test lead submission to different forms
6. Verify leads are routed correctly

### Acceptance Criteria
- [ ] Multiple accounts are created (one per lead form)
- [ ] No duplicate key errors occur
- [ ] Each account has correct companyId, pageId, leadFormId
- [ ] Leads from different forms are stored separately
- [ ] Webhook routing works correctly

---

## Task 7: Test Idempotency
**Status:** Pending
**Priority:** Medium
**Estimated Time:** 15 minutes

### Description
Verify that reconnecting the same page doesn't create duplicate accounts.

### Steps
1. Connect a Facebook page with lead forms
2. Disconnect and reconnect the same page
3. Verify no duplicate accounts are created
4. Check logs for "already exists" messages
5. Verify existing accounts still work

### Acceptance Criteria
- [ ] No duplicate accounts are created
- [ ] Appropriate logs indicate skipping existing accounts
- [ ] Existing accounts remain functional
- [ ] No errors occur during reconnection

---

## Task 8: Documentation Update
**Status:** Pending
**Priority:** Low
**Estimated Time:** 20 minutes

### Description
Update documentation to reflect the changes.

### Steps
1. Update API documentation if needed
2. Add migration notes to deployment guide
3. Document the new index structure
4. Add troubleshooting section

### Acceptance Criteria
- [ ] Documentation reflects new index structure
- [ ] Migration steps are documented
- [ ] Troubleshooting guide is updated
- [ ] Examples show multiple lead forms per page

---

## Summary

**Total Estimated Time:** 3 hours 45 minutes

**Critical Path:**
1. Task 1: Create Migration Script
2. Task 2: Update Model
3. Task 3: Update Service Logic
4. Task 4: Run Migration
5. Task 6: Test with Multiple Lead Forms

**Dependencies:**
- Task 4 depends on Tasks 1, 2, 3
- Tasks 5, 6, 7 depend on Task 4
- Task 8 can be done in parallel


---

## Quick Start Checklist

### Pre-Deployment
- [ ] Review all changes in git
- [ ] Backup production database
- [ ] Test migration on staging database
- [ ] Verify staging application works correctly

### Deployment Steps
1. [ ] Stop application: `pm2 stop all`
2. [ ] Pull latest code: `git pull origin main`
3. [ ] Run migration: `npm run migrate:facebook-index`
4. [ ] Verify migration: `npm run verify:facebook-accounts`
5. [ ] Start application: `pm2 start all`
6. [ ] Check logs: `pm2 logs`

### Post-Deployment Verification
- [ ] Connect a test Facebook page with 1 form
- [ ] Verify account is created successfully
- [ ] Connect a test Facebook page with 2+ forms
- [ ] Verify multiple accounts are created
- [ ] Submit test leads to different forms
- [ ] Verify leads are received and stored correctly
- [ ] Check for any errors in logs
- [ ] Monitor for 24 hours

### Rollback Plan (If Needed)
- [ ] Stop application
- [ ] Restore database from backup
- [ ] Revert code changes
- [ ] Restart application
- [ ] Verify old functionality works

---

## Command Reference

```bash
# Migration
npm run migrate:facebook-index

# Verification
npm run verify:facebook-accounts

# Check logs
tail -f logs/$(date +%Y-%m-%d)/all-logs.log

# MongoDB shell commands
mongo your_database
db.facebookaccounts.getIndexes()
db.facebookaccounts.find({ pageId: "your_page_id" })
```
