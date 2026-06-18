/**
 * Maintenance Script: De-duplicate Leads by contactNumber
 *
 * Finds leads that share the same `contactNumber` within a single company and
 * removes the duplicates, keeping the OLDEST lead (earliest createdAt / _id) for
 * each contactNumber.
 *
 * SAFETY:
 *   - Runs as a DRY-RUN by default: it only counts and reports duplicates.
 *   - Pass --delete to actually remove the duplicate documents.
 *
 * Usage:
 *   Dry run (count only):
 *     node server/migrations/dedupe-leads-by-contact.js --company=69d4786b6a13471034370e79
 *
 *   Perform deletion:
 *     node server/migrations/dedupe-leads-by-contact.js --company=69d4786b6a13471034370e79 --delete
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables (same convention as other migrations)
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// ---- Parse CLI args -------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
};

const COMPANY_ID = getArg('company') || '69d4786b6a13471034370e79';
const APPLY_DELETE = args.includes('--delete');

async function run() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI / MONGO_URI is not set. Check server/config/.env');
    process.exit(1);
  }
  if (!mongoose.Types.ObjectId.isValid(COMPANY_ID)) {
    console.error(`❌ Invalid company id: ${COMPANY_ID}`);
    process.exit(1);
  }

  const companyObjectId = new mongoose.Types.ObjectId(COMPANY_ID);

  console.log('🚀 Lead de-duplication by contactNumber');
  console.log(`   Company : ${COMPANY_ID}`);
  console.log(`   Mode    : ${APPLY_DELETE ? '⚠️  DELETE' : 'DRY-RUN (count only)'}\n`);

  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected\n');

  const collection = mongoose.connection.db.collection('leads');

  // Group by contactNumber for this company. Ignore null/empty contactNumber so
  // we never treat "missing phone" leads as duplicates of each other.
  const groups = await collection
    .aggregate([
      {
        $match: {
          companyId: companyObjectId,
          contactNumber: { $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$contactNumber',
          // Keep the oldest first so we can drop the rest.
          ids: { $push: { _id: '$_id', createdAt: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  const totalLeadsForCompany = await collection.countDocuments({ companyId: companyObjectId });

  if (groups.length === 0) {
    console.log(`✅ No duplicate contactNumbers found. (Total leads for company: ${totalLeadsForCompany})`);
    await mongoose.connection.close();
    return;
  }

  // Build the list of _ids to delete: for each group keep the oldest, delete the rest.
  const idsToDelete = [];
  for (const g of groups) {
    const sorted = g.ids.slice().sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : a._id.getTimestamp().getTime();
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : b._id.getTimestamp().getTime();
      return ta - tb; // oldest first
    });
    // sorted[0] is kept; the rest are duplicates to remove.
    for (let i = 1; i < sorted.length; i++) idsToDelete.push(sorted[i]._id);
  }

  // ---- Report --------------------------------------------------------------
  console.log('📊 Duplicate report');
  console.log(`   Total leads for company        : ${totalLeadsForCompany}`);
  console.log(`   contactNumbers with duplicates : ${groups.length}`);
  console.log(`   Duplicate leads to remove      : ${idsToDelete.length}`);
  console.log(`   Leads remaining after cleanup  : ${totalLeadsForCompany - idsToDelete.length}\n`);

  console.log('   Top duplicated contactNumbers:');
  groups.slice(0, 20).forEach((g) => {
    console.log(`     ${g._id}  ->  ${g.count} leads (${g.count - 1} to remove)`);
  });
  if (groups.length > 20) console.log(`     ...and ${groups.length - 20} more`);
  console.log('');

  if (!APPLY_DELETE) {
    console.log('🟡 DRY-RUN complete. No documents were deleted.');
    console.log('   Re-run with --delete to remove the duplicates shown above.');
    await mongoose.connection.close();
    return;
  }

  // ---- Delete --------------------------------------------------------------
  console.log(`🗑️  Deleting ${idsToDelete.length} duplicate leads...`);
  const result = await collection.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`✅ Deleted ${result.deletedCount} leads.`);

  const remaining = await collection.countDocuments({ companyId: companyObjectId });
  console.log(`   Leads remaining for company: ${remaining}`);

  await mongoose.connection.close();
  console.log('\n🏁 Done.');
}

run().catch(async (err) => {
  console.error('💥 Error:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
