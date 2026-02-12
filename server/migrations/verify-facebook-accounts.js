/**
 * Verification Script: Check Facebook Account Data
 * 
 * This script verifies the state of FacebookAccount documents after migration.
 * It checks for:
 * - Duplicate accounts (same companyId + pageId + leadFormId)
 * - Missing leadFormId values
 * - Index configuration
 * 
 * Usage: node server/migrations/verify-facebook-accounts.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function verifyAccounts() {
  console.log('🔍 Starting Facebook Account Verification...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('facebookaccounts');

    // Check indexes
    console.log('📋 Checking indexes...');
    const indexes = await collection.indexes();
    console.log('Indexes:', JSON.stringify(indexes, null, 2));
    console.log('');

    // Verify new index exists
    const hasNewIndex = indexes.some(idx => {
      const keys = idx.key;
      return keys.companyId === 1 && 
             keys.pageId === 1 && 
             keys.leadFormId === 1 &&
             idx.unique === true;
    });

    if (hasNewIndex) {
      console.log('✅ New unique index { companyId, pageId, leadFormId } exists\n');
    } else {
      console.log('❌ New unique index NOT found!\n');
    }

    // Count total documents
    const totalCount = await collection.countDocuments();
    console.log(`📊 Total FacebookAccount documents: ${totalCount}\n`);

    // Check for documents without leadFormId
    const missingLeadFormId = await collection.countDocuments({
      leadFormId: { $exists: false }
    });

    if (missingLeadFormId > 0) {
      console.log(`⚠️  Found ${missingLeadFormId} document(s) without leadFormId`);
      const samples = await collection.find({ leadFormId: { $exists: false } }).limit(5).toArray();
      console.log('Sample documents:', JSON.stringify(samples, null, 2));
      console.log('');
    } else {
      console.log('✅ All documents have leadFormId\n');
    }

    // Check for potential duplicates (same companyId + pageId + leadFormId)
    console.log('🔍 Checking for duplicate accounts...');
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: {
            companyId: '$companyId',
            pageId: '$pageId',
            leadFormId: '$leadFormId'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate account(s):`);
      console.log(JSON.stringify(duplicates, null, 2));
      console.log('');
    } else {
      console.log('✅ No duplicate accounts found\n');
    }

    // Group by page to show multiple forms per page
    console.log('📊 Accounts grouped by page:');
    const groupedByPage = await collection.aggregate([
      {
        $group: {
          _id: {
            companyId: '$companyId',
            pageId: '$pageId',
            pageName: '$pageName'
          },
          leadForms: {
            $push: {
              leadFormId: '$leadFormId',
              accountName: '$accountName',
              isActive: '$isActive'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (groupedByPage.length > 0) {
      console.log(`Found ${groupedByPage.length} page(s) with multiple lead forms:`);
      groupedByPage.forEach(page => {
        console.log(`\nPage: ${page._id.pageName || page._id.pageId}`);
        console.log(`  Company ID: ${page._id.companyId}`);
        console.log(`  Lead Forms: ${page.count}`);
        page.leadForms.forEach((form, idx) => {
          console.log(`    ${idx + 1}. ${form.accountName} (${form.leadFormId}) - Active: ${form.isActive}`);
        });
      });
      console.log('');
    } else {
      console.log('No pages with multiple lead forms found\n');
    }

    console.log('✅ Verification completed!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run verification
verifyAccounts();
