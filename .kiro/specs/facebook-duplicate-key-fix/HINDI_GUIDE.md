# Facebook Duplicate Key Fix - Hindi Guide

## Problem Kya Thi?

Jab aap ek Facebook page connect karte ho jisme multiple lead forms hain (jaise "Contact Us", "Get Quote", "Newsletter" etc.), to system har form ke liye alag account banana chahta hai. Lekin database mein ek rule tha jo kehta tha:

> "Ek company ke liye, ek page ka sirf ek account ho sakta hai"

Isliye jab second form add hota tha, to error aata tha:
```
E11000 duplicate key error: companyId + pageId already exists
```

## Solution Kya Hai?

Ab rule change kar diya hai:

> "Ek company ke liye, ek page ke har lead form ka alag account ho sakta hai"

Database rule ab yeh hai:
```
companyId + pageId + leadFormId = Unique
```

## Kaise Kaam Karta Hai?

### Example:

**Pehle (Old System):**
```
Company: ABC Ltd
Page: ABC Facebook Page
Forms: 
  - Contact Form ❌ (Error - duplicate key)
  - Quote Form ❌ (Error - duplicate key)

Result: Sirf pehla form add hota tha
```

**Ab (New System):**
```
Company: ABC Ltd
Page: ABC Facebook Page
Forms:
  - Contact Form ✅ (Account 1)
  - Quote Form ✅ (Account 2)
  - Newsletter Form ✅ (Account 3)

Result: Saare forms add ho jayenge
```

## Files Kahan Hain?

### 1. Migration Script
**Location:** `server/migrations/fix-facebook-account-index.js`

Yeh script database ko update karega:
- Purana rule hata dega
- Naya rule add karega

### 2. Verification Script
**Location:** `server/migrations/verify-facebook-accounts.js`

Yeh script check karega ki sab theek hai ya nahi:
- Index sahi hai?
- Duplicate accounts to nahi?
- Kitne pages mein multiple forms hain?

### 3. Model File
**Location:** `server/api/thirdParty/facebookAccount.model.js`

Database schema - yahan index definition update hui hai.

### 4. Service File
**Location:** `server/api/thirdParty/facebook.service.js`

Business logic - yeh already sahi hai, koi change nahi chahiye.

## Kaise Use Karein?

### Step 1: Database Backup (Zaroori!)
```bash
mongodump --uri="your_mongodb_uri" --out=backup_before_migration
```

### Step 2: Migration Run Karein
```bash
npm run migrate:facebook-index
```

Yeh command:
1. Database se connect karega
2. Purana index drop karega
3. Naya index create karega
4. Success message dikhayega

### Step 3: Verify Karein
```bash
npm run verify:facebook-accounts
```

Yeh command check karega:
- Naya index ban gaya?
- Koi duplicate accounts to nahi?
- Saare documents mein leadFormId hai?

### Step 4: Test Karein

#### Test 1: Ek Form Wala Page
1. Facebook page connect karein (1 form ke saath)
2. Check karein - 1 account bana?
3. Database mein dekho

#### Test 2: Multiple Forms Wala Page
1. Facebook page connect karein (2-3 forms ke saath)
2. Check karein - har form ka alag account bana?
3. Database mein dekho - same pageId, different leadFormId

#### Test 3: Dobara Connect Karein
1. Same page disconnect karein
2. Phir se connect karein
3. Check karein - duplicate accounts to nahi bane?

## Common Problems aur Solutions

### Problem 1: "Duplicate key error" aa raha hai

**Reason:** Migration properly nahi chala

**Solution:**
```bash
# Manually old index drop karein
mongo your_database
db.facebookaccounts.dropIndex("companyId_1_pageId_1")

# Migration phir se run karein
npm run migrate:facebook-index
```

### Problem 2: Multiple accounts nahi ban rahe

**Reason:** Service code mein issue ho sakta hai

**Solution:**
`server/api/thirdParty/facebook.service.js` file check karein:
```javascript
// Yeh line honi chahiye
const existingAccount = await FacebookAccount.findOne({
  companyId: simpleAccount.companyId,
  pageId: page.id,
  leadFormId: form.id  // ← Yeh zaroori hai
});
```

### Problem 3: Purane accounts kaam nahi kar rahe

**Reason:** Purane documents mein leadFormId nahi hai

**Solution:**
```javascript
// MongoDB shell mein run karein
db.facebookaccounts.updateMany(
  { leadFormId: { $exists: false } },
  { $set: { leadFormId: "default" } }
)
```

## Kya Fayde Hain?

✅ Ek page pe multiple forms add ho sakte hain
✅ Har form ka apna configuration
✅ Har form ke leads alag track honge
✅ No more duplicate key errors
✅ Purane accounts bhi kaam karenge

## Monitoring Kaise Karein?

### 1. Logs Check Karein
```bash
tail -f logs/$(date +%Y-%m-%d)/all-logs.log
```

Dekho:
- "Account already exists" - Normal hai
- "Duplicate key error" - Nahi aana chahiye

### 2. Database Check Karein
```javascript
// Pages with multiple forms
db.facebookaccounts.aggregate([
  { $group: { 
    _id: { pageId: "$pageId", pageName: "$pageName" },
    forms: { $sum: 1 }
  }},
  { $match: { forms: { $gt: 1 } }}
])
```

### 3. Webhook Check Karein
- Leads aa rahe hain?
- Sahi account mein store ho rahe hain?

## Rollback Kaise Karein?

Agar koi problem ho:

```bash
# 1. Application stop karein
pm2 stop all

# 2. Database restore karein
mongorestore --uri="your_mongodb_uri" backup_before_migration

# 3. Code revert karein
git revert <commit_hash>

# 4. Application start karein
pm2 start all
```

## Summary

**Pehle:**
- 1 page = 1 account
- Multiple forms = Error ❌

**Ab:**
- 1 page = Multiple accounts (har form ke liye)
- Multiple forms = Sab add ho jayenge ✅

## Next Steps

1. ✅ Migration script ready hai
2. ✅ Model update ho gaya
3. ✅ Service logic already sahi hai
4. ⏳ Staging pe test karein
5. ⏳ Production pe deploy karein
6. ⏳ 24 hours monitor karein

## Help Chahiye?

1. Logs dekho: `tail -f logs/$(date +%Y-%m-%d)/all-logs.log`
2. Verify run karo: `npm run verify:facebook-accounts`
3. Database indexes check karo: `db.facebookaccounts.getIndexes()`

---

**Important:** Migration run karne se pehle database backup zaroor lein!
