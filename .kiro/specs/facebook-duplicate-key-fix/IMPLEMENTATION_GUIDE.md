# Facebook Duplicate Key Fix - Implementation Guide

## Problem Summary

Jab ek Facebook page pe multiple lead forms hote hain, to system har form ke liye alag `FacebookAccount` create karna chahta hai. Lekin database index sirf `companyId + pageId` pe unique constraint tha, jisse duplicate key error aa raha tha.

## Solution

Index ko update kiya gaya hai: `{ companyId, pageId, leadFormId }` - ab har lead form ka apna account ho sakta hai.

## Files Changed

### 1. Model Update
**File:** `server/api/thirdParty/facebookAccount.model.js`

```javascript
// Old index (removed)
facebookAccountSchema.index({ companyId: 1, pageId: 1 }, { unique: true });

// New index (added)
facebookAccountSchema.index({ companyId: 1, pageId: 1, leadFormId: 1 }, { unique: true });
```

### 2. Service Logic (Already Fixed)
**File:** `server/api/thirdParty/facebook.service.js`

Function `processSimpleAccount` already has the correct logic:
- Checks for existing account using all three fields
- Creates separate account for each lead form
- Handles errors gracefully

### 3. Migration Scripts Created

**Migration Script:** `server/migrations/fix-facebook-account-index.js`
- Drops old index
- Creates new index
- Idempotent (safe to run multiple times)

**Verification Script:** `server/migrations/verify-facebook-accounts.js`
- Checks index configuration
- Finds duplicate accounts
- Shows pages with multiple forms

## How to Apply the Fix

### Step 1: Backup Database (Recommended)
```bash
# MongoDB backup command
mongodump --uri="your_mongodb_uri" --out=backup_before_migration
```

### Step 2: Run Migration
```bash
npm run migrate:facebook-index
```

Expected output:
```
🚀 Starting Facebook Account Index Migration...
📡 Connecting to MongoDB...
✅ Connected to MongoDB

🔍 Checking existing indexes...
⚠️  Old index "companyId_1_pageId_1" found. Dropping...
✅ Successfully dropped old index

📝 Creating new index { companyId: 1, pageId: 1, leadFormId: 1 }...
✅ Successfully created new unique index

✅ Migration completed successfully!
```

### Step 3: Verify Migration
```bash
npm run verify:facebook-accounts
```

Expected output:
```
🔍 Starting Facebook Account Verification...
✅ New unique index { companyId, pageId, leadFormId } exists
✅ All documents have leadFormId
✅ No duplicate accounts found
```

### Step 4: Test the System

#### Test Case 1: Single Lead Form
1. Connect a Facebook page with 1 lead form
2. Verify 1 FacebookAccount is created
3. Check database: `db.facebookaccounts.find({ pageId: "your_page_id" })`

#### Test Case 2: Multiple Lead Forms
1. Connect a Facebook page with 2+ lead forms
2. Verify multiple FacebookAccounts are created (one per form)
3. Check database: Should see multiple documents with same pageId but different leadFormId

#### Test Case 3: Reconnection (Idempotency)
1. Disconnect and reconnect the same page
2. Verify no duplicate accounts are created
3. Check logs for "Account already exists" messages

## Troubleshooting

### Error: "E11000 duplicate key error"

**Cause:** Old index still exists or migration didn't run properly

**Solution:**
```bash
# Manually drop old index
mongo your_database
db.facebookaccounts.dropIndex("companyId_1_pageId_1")

# Run migration again
npm run migrate:facebook-index
```

### Error: "leadFormId is required"

**Cause:** Some old documents don't have leadFormId

**Solution:**
```javascript
// Update old documents (run in MongoDB shell)
db.facebookaccounts.updateMany(
  { leadFormId: { $exists: false } },
  { $set: { leadFormId: "unknown" } }
)
```

### Multiple Accounts Not Being Created

**Cause:** Check if processSimpleAccount is using correct query

**Solution:**
Verify the existence check in `facebook.service.js`:
```javascript
const existingAccount = await FacebookAccount.findOne({
  companyId: simpleAccount.companyId,
  pageId: page.id,
  leadFormId: form.id  // ← This must be included
});
```

## Rollback Plan

If you need to rollback:

```bash
# 1. Stop the application
pm2 stop all

# 2. Restore database from backup
mongorestore --uri="your_mongodb_uri" backup_before_migration

# 3. Revert code changes
git revert <commit_hash>

# 4. Restart application
pm2 start all
```

## Monitoring

After deployment, monitor:

1. **Application Logs**
   - Look for "Account already exists" messages (normal)
   - Look for duplicate key errors (should not occur)

2. **Database**
   ```javascript
   // Check for pages with multiple forms
   db.facebookaccounts.aggregate([
     { $group: { 
       _id: { companyId: "$companyId", pageId: "$pageId" },
       count: { $sum: 1 }
     }},
     { $match: { count: { $gt: 1 } }}
   ])
   ```

3. **Webhook Logs**
   - Verify leads are being received
   - Check if leads are routed to correct accounts

## Benefits

✅ Multiple lead forms per page now supported
✅ No more duplicate key errors
✅ Each form has its own configuration
✅ Better lead tracking and management
✅ Backward compatible with existing data

## Next Steps

1. ✅ Migration script created
2. ✅ Model updated
3. ✅ Service logic already correct
4. ⏳ Run migration on staging
5. ⏳ Test thoroughly
6. ⏳ Deploy to production
7. ⏳ Monitor for 24 hours

## Support

If you encounter any issues:
1. Check logs: `tail -f logs/$(date +%Y-%m-%d)/all-logs.log`
2. Run verification: `npm run verify:facebook-accounts`
3. Check MongoDB indexes: `db.facebookaccounts.getIndexes()`
