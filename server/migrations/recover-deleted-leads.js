/**
 * Recovery Script: Re-create leads deleted during the contactNumber de-dup.
 *
 * Strategy:
 *   The deleted leads' comments/statuses still live in `leadhistories`, tagged
 *   with the deleted lead's ORIGINAL _id. We re-insert a lead document using that
 *   same _id, so every orphaned history row re-links automatically and the
 *   comments reappear in the CRM.
 *
 * What we CAN restore : _id, companyId, leadStatus (from latest history),
 *                       followUpDate, leadLostReason, approx createdAt (from _id).
 * What we CANNOT       : name / phone / email — these were never stored anywhere
 *                       keyed by _id. They're marked [RECOVERED] for follow-up.
 *
 * SAFETY:
 *   - Always writes a JSON dump of what it will insert BEFORE doing anything.
 *   - Dry-run by default; pass --apply to actually insert.
 *   - Skips any _id that already exists (idempotent — safe to re-run).
 *
 * Usage:
 *   Dry run:  node server/migrations/recover-deleted-leads.js --company=69d4786b6a13471034370e79
 *   Apply:    node server/migrations/recover-deleted-leads.js --company=69d4786b6a13471034370e79 --apply
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
const COMPANY_ID = getArg('company') || '69d4786b6a13471034370e79';
const APPLY = args.includes('--apply');

const RECOVERY_NOTE =
  '[RECOVERED] This lead was deleted during contactNumber de-duplication and ' +
  're-created from its preserved history. Contact name/phone/email were not ' +
  'recoverable from the database — check the surviving lead with the same phone, ' +
  'or the source Google Sheet.';

async function run() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI / MONGO_URI is not set.');
    process.exit(1);
  }
  const companyObjectId = new mongoose.Types.ObjectId(COMPANY_ID);

  console.log('🛟 Lead recovery (re-create deleted leads by original _id)');
  console.log(`   Company : ${COMPANY_ID}`);
  console.log(`   Mode    : ${APPLY ? '⚠️  APPLY (will insert)' : 'DRY-RUN (no writes)'}\n`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const leads = db.collection('leads');
  const history = db.collection('leadhistories');

  // For each leadId in leadHistory whose lead no longer exists, take the most
  // recent history row to source the status / followup / lost-reason.
  const orphans = await history
    .aggregate([
      { $match: { companyId: companyObjectId } },
      {
        $lookup: {
          from: 'leads',
          localField: 'leadId',
          foreignField: '_id',
          as: 'lead',
        },
      },
      { $match: { lead: { $size: 0 } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$leadId',
          companyId: { $first: '$companyId' },
          leadStatus: { $first: '$status' },
          leadLostReason: { $first: '$leadLostReason' },
          followUpDate: { $first: '$followupDate' },
          historyRows: { $sum: 1 },
        },
      },
    ])
    .toArray();

  if (orphans.length === 0) {
    console.log('✅ Nothing to recover — no orphaned leadHistory found for this company.');
    await mongoose.connection.close();
    return;
  }

  // Build the lead documents to insert (original _id + approx createdAt from _id).
  const now = new Date();
  const docs = orphans.map((o) => {
    const createdAt = o._id.getTimestamp ? o._id.getTimestamp() : now;
    const doc = {
      _id: o._id,
      companyId: o.companyId,
      leadAddType: 'ThirdParty',
      description: RECOVERY_NOTE,
      leadCost: 0,
      leadWonAmount: 0,
      addCalender: false,
      leadUpdated: false,
      engagementCountByDay: {},
      createdAt,
      updatedAt: now,
    };
    if (o.leadStatus) doc.leadStatus = o.leadStatus;
    if (o.leadLostReason) doc.leadLostReason = o.leadLostReason;
    if (o.followUpDate) doc.followUpDate = o.followUpDate;
    return doc;
  });

  // Only insert ids that don't already exist (idempotent / safe to re-run).
  const ids = docs.map((d) => d._id);
  const existing = await leads
    .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
    .toArray();
  const existingSet = new Set(existing.map((e) => String(e._id)));
  const toInsert = docs.filter((d) => !existingSet.has(String(d._id)));

  // ALWAYS dump before doing anything.
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const dumpPath = path.join(__dirname, `recover-deleted-leads.${stamp}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(toInsert, null, 2));

  console.log('📊 Plan');
  console.log(`   Orphaned (deleted) leads found : ${orphans.length}`);
  console.log(`   Already present (skip)         : ${docs.length - toInsert.length}`);
  console.log(`   Leads to re-create             : ${toInsert.length}`);
  console.log(`   Dump written to                : ${dumpPath}\n`);

  if (!APPLY) {
    console.log('🟡 DRY-RUN complete. No documents inserted.');
    console.log('   Review the dump above, then re-run with --apply to recover.');
    await mongoose.connection.close();
    return;
  }

  if (toInsert.length === 0) {
    console.log('✅ Nothing to insert — everything already recovered.');
    await mongoose.connection.close();
    return;
  }

  console.log(`🛟 Re-creating ${toInsert.length} leads...`);
  const result = await leads.insertMany(toInsert, { ordered: false });
  console.log(`✅ Inserted ${result.insertedCount} leads. Their history comments are now re-linked.`);

  await mongoose.connection.close();
  console.log('\n🏁 Done.');
}

run().catch(async (err) => {
  // insertMany may throw on partial dup-key; report how many still got in.
  if (err && err.result) {
    console.error(`⚠️  Partial insert: ${err.result.nInserted} inserted before error.`);
  }
  console.error('💥 Error:', err.message || err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
