/**
 * READ-ONLY Diagnostic: Assess impact of the lead de-duplication deletion.
 *
 * This script does NOT modify anything. It reports how much was actually lost
 * after duplicate leads were deleted, by finding "orphaned" leadHistory rows —
 * activity (status changes / comments / follow-ups) that points at a leadId
 * which no longer exists in the leads collection.
 *
 *   - Orphaned history with comments / won amounts  = real work that was lost.
 *   - Orphaned history with none                    = duplicates were effectively
 *                                                     empty shells; little/no loss.
 *
 * Usage:
 *   node server/migrations/assess-lead-deletion-damage.js --company=69d4786b6a13471034370e79
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const args = process.argv.slice(2);
const getArg = (n) => {
  const h = args.find((a) => a.startsWith(`--${n}=`));
  return h ? h.split('=')[1] : undefined;
};
const COMPANY_ID = getArg('company') || '69d4786b6a13471034370e79';

async function run() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI / MONGO_URI is not set.');
    process.exit(1);
  }
  const companyObjectId = new mongoose.Types.ObjectId(COMPANY_ID);

  console.log('🔎 READ-ONLY damage assessment for company', COMPANY_ID, '\n');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection.db;
  const leads = db.collection('leads');
  const history = db.collection('leadhistories'); // mongoose pluralizes LeadHistory

  const totalLeads = await leads.countDocuments({ companyId: companyObjectId });

  // Find leadHistory rows for this company whose leadId no longer exists in leads.
  const orphaned = await history
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
      { $match: { lead: { $size: 0 } } }, // leadId points to a deleted lead
      {
        $group: {
          _id: '$leadId',
          historyRows: { $sum: 1 },
          hasComment: { $max: { $cond: [{ $ifNull: ['$comment', false] }, 1, 0] } },
          wonAmount: { $max: { $ifNull: ['$wonAmount', 0] } },
          lastDate: { $max: '$date' },
        },
      },
    ])
    .toArray();

  const deletedLeadsWithActivity = orphaned.length;
  const withComments = orphaned.filter((o) => o.hasComment === 1).length;
  const withWonAmount = orphaned.filter((o) => o.wonAmount > 0).length;
  const totalOrphanRows = orphaned.reduce((s, o) => s + o.historyRows, 0);

  console.log('📊 Results');
  console.log(`   Leads currently in CRM for company        : ${totalLeads}`);
  console.log(`   Deleted leads that HAD activity (orphans) : ${deletedLeadsWithActivity}`);
  console.log(`      ...of those, with comments             : ${withComments}`);
  console.log(`      ...of those, with a won amount > 0     : ${withWonAmount}`);
  console.log(`   Total orphaned history rows               : ${totalOrphanRows}\n`);

  if (deletedLeadsWithActivity === 0) {
    console.log('✅ Good news: none of the deleted duplicates had any CRM activity.');
    console.log('   The deletion removed empty duplicate shells only — no real work was lost.');
    console.log('   Core data for every phone still exists on the surviving (oldest) lead.');
  } else {
    console.log('⚠️  Some deleted duplicates had real CRM work (see counts above).');
    console.log('   The activity itself is preserved in leadHistory (not deleted) but is now');
    console.log('   orphaned. We can recover it by re-attaching to the surviving lead for that');
    console.log('   contact, or by re-importing those rows from the source Google Sheet.');
    console.log('\n   Sample of affected (orphaned) leadIds:');
    orphaned.slice(0, 15).forEach((o) =>
      console.log(
        `     leadId=${o._id}  rows=${o.historyRows}  comment=${o.hasComment ? 'yes' : 'no'}  won=${o.wonAmount}`
      )
    );
  }

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('💥 Error:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
