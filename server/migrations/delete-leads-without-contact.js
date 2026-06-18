/**
 * Maintenance Script: Delete leads that have NO contact number.
 *
 * "No contact number" = field missing, null, empty, or whitespace-only.
 *
 * SAFETY:
 *   - DUMPS every matching document to a JSON file BEFORE deleting (so this is
 *     always reversible via mongorestore / re-insert).
 *   - Dry-run by default: counts + dumps only. Pass --delete to actually remove.
 *   - Optional --company to scope to a single company (recommended).
 *
 * NOTE: the [RECOVERED] leads created during de-dup recovery have no contact
 *       number, so they will match this filter. Deleting them re-orphans their
 *       leadHistory comments. The dump lets you undo if needed.
 *
 * Usage:
 *   Dry run (count + dump):   node server/migrations/delete-leads-without-contact.js --company=69d4786b6a13471034370e79
 *   Delete:                   node server/migrations/delete-leads-without-contact.js --company=69d4786b6a13471034370e79 --delete
 *   All companies (careful):  node server/migrations/delete-leads-without-contact.js --delete
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const args = process.argv.slice(2);
const getArg = (n) => {
  const h = args.find((a) => a.startsWith(`--${n}=`));
  return h ? h.split('=')[1] : undefined;
};
const COMPANY_ID = getArg('company'); // optional
const APPLY_DELETE = args.includes('--delete');

async function run() {
  if (!MONGODB_URI) { console.error('❌ MONGO URI not set.'); process.exit(1); }

  // A lead has "no contact number" if the field is absent/null/empty/whitespace.
  const filter = {
    $or: [
      { contactNumber: { $exists: false } },
      { contactNumber: null },
      { contactNumber: '' },
      { contactNumber: { $regex: /^\s*$/ } },
    ],
  };
  if (COMPANY_ID) {
    if (!mongoose.Types.ObjectId.isValid(COMPANY_ID)) {
      console.error(`❌ Invalid company id: ${COMPANY_ID}`);
      process.exit(1);
    }
    filter.companyId = new mongoose.Types.ObjectId(COMPANY_ID);
  }

  console.log('🧹 Delete leads without a contact number');
  console.log(`   Scope : ${COMPANY_ID ? 'company ' + COMPANY_ID : '⚠️  ALL COMPANIES'}`);
  console.log(`   Mode  : ${APPLY_DELETE ? '⚠️  DELETE' : 'DRY-RUN (count + dump only)'}\n`);

  await mongoose.connect(MONGODB_URI);
  const leads = mongoose.connection.db.collection('leads');

  const matching = await leads.find(filter).toArray();
  const total = COMPANY_ID
    ? await leads.countDocuments({ companyId: filter.companyId })
    : await leads.estimatedDocumentCount();

  if (matching.length === 0) {
    console.log('✅ No leads without a contact number. Nothing to do.');
    await mongoose.connection.close();
    return;
  }

  // ALWAYS dump before doing anything (reversibility).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpPath = path.join(__dirname, `deleted-leads-without-contact.${stamp}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(matching, null, 2));

  const recoveredCount = matching.filter(
    (l) => typeof l.description === 'string' && l.description.startsWith('[RECOVERED]')
  ).length;

  console.log('📊 Plan');
  console.log(`   Leads in scope                 : ${total}`);
  console.log(`   Leads WITHOUT contact number   : ${matching.length}`);
  console.log(`   ...of which are [RECOVERED]    : ${recoveredCount}`);
  console.log(`   Backup dump written to         : ${dumpPath}\n`);

  if (!APPLY_DELETE) {
    console.log('🟡 DRY-RUN complete. No documents deleted.');
    console.log('   Review the dump above, then re-run with --delete to remove them.');
    await mongoose.connection.close();
    return;
  }

  const ids = matching.map((l) => l._id);
  console.log(`🗑️  Deleting ${ids.length} leads...`);
  const result = await leads.deleteMany({ _id: { $in: ids } });
  console.log(`✅ Deleted ${result.deletedCount} leads.`);
  console.log(`   (Restore from ${dumpPath} if needed.)`);

  await mongoose.connection.close();
  console.log('\n🏁 Done.');
}

run().catch(async (err) => {
  console.error('💥 Error:', err.message || err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
