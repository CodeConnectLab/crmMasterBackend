/**
 * Migration Script: Fix Facebook Account Index
 * 
 * This script updates the unique index on FacebookAccount collection from
 * { companyId: 1, pageId: 1 } to { companyId: 1, pageId: 1, leadFormId: 1 }
 * 
 * This allows multiple lead forms per page to be stored as separate accounts.
 * 
 * Usage: node server/migrations/fix-facebook-account-index.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const OLD_INDEX_NAME = 'companyId_1_pageId_1';
const NEW_INDEX_SPEC = { companyId: 1, pageId: 1, leadFormId: 1 };
const NEW_INDEX_OPTIONS = { unique: true };

async function runMigration() {
  console.log('🚀 Starting Facebook Account Index Migration...\n');

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

    // Get existing indexes
    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    console.log('');

    // Check if old index exists
    const oldIndexExists = indexes.some(idx => idx.name === OLD_INDEX_NAME);
    
    if (oldIndexExists) {
      console.log(`⚠️  Old index "${OLD_INDEX_NAME}" found. Dropping...`);
      try {
        await collection.dropIndex(OLD_INDEX_NAME);
        console.log(`✅ Successfully dropped old index "${OLD_INDEX_NAME}"\n`);
      } catch (dropError) {
        console.error(`❌ Error dropping old index:`, dropError.message);
        throw dropError;
      }
    } else {
      console.log(`ℹ️  Old index "${OLD_INDEX_NAME}" not found (already removed or never existed)\n`);
    }

    // Check if new index already exists
    const newIndexExists = indexes.some(idx => {
      const keys = idx.key;
      return keys.companyId === 1 && 
             keys.pageId === 1 && 
             keys.leadFormId === 1 &&
             idx.unique === true;
    });

    if (newIndexExists) {
      console.log('ℹ️  New index already exists. Skipping creation.\n');
    } else {
      console.log('📝 Creating new index { companyId: 1, pageId: 1, leadFormId: 1 }...');
      try {
        await collection.createIndex(NEW_INDEX_SPEC, NEW_INDEX_OPTIONS);
        console.log('✅ Successfully created new unique index\n');
      } catch (createError) {
        console.error('❌ Error creating new index:', createError.message);
        throw createError;
      }
    }

    // Verify final state
    console.log('🔍 Verifying final index state...');
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', JSON.stringify(finalIndexes, null, 2));
    console.log('');

    // Count documents
    const docCount = await collection.countDocuments();
    console.log(`📊 Total FacebookAccount documents: ${docCount}\n`);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify the application code is updated to use the new index');
    console.log('2. Test creating Facebook accounts with multiple lead forms per page');
    console.log('3. Monitor logs for any duplicate key errors');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
runMigration();
