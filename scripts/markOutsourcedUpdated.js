/**
 * One-off backlog cleanup: mark Imported / Outsourced leads as leadUpdated:true
 * so already-assigned/old leads drop off the Imported & Outsourced Leads pages.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." \
 *   COMPANY_ID="<id>" \           # optional — omit to apply across ALL companies
 *   LEAD_TYPE="Import"            # Import | ThirdParty | all (default: all)
 *   node scripts/markOutsourcedUpdated.js
 *
 *   Import      -> Imported Leads page
 *   ThirdParty  -> Outsourced Leads page
 *   all         -> both
 */
const mongoose = require('mongoose');

(async () => {
  const uri =
    process.env.MONGO_URI
  if (!uri) throw new Error('Set MONGO_URI');
  await mongoose.connect(uri);

  // Which add-types to clear.
  const typeArg = (process.env.LEAD_TYPE || 'all').toLowerCase();
  const types =
    typeArg === 'import' ? ['Import']
      : typeArg === 'thirdparty' ? ['ThirdParty']
        : ['Import', 'ThirdParty'];

  const filter = { leadAddType: { $in: types }, leadUpdated: false };
  const COMPANY_ID = process.env.COMPANY_ID ;
  if (COMPANY_ID) filter.companyId = new mongoose.Types.ObjectId(COMPANY_ID);

  const leads = mongoose.connection.db.collection('leads');
  const before = await leads.countDocuments(filter);
  console.log(`Types: ${types.join(', ')} | Matching (leadUpdated:false) leads:`, before);

  const res = await leads.updateMany(filter, {
    $set: { leadUpdated: true, updatedAt: new Date() },
  });
  console.log('Modified:', res.modifiedCount);

  const after = await leads.countDocuments(filter);
  console.log('Remaining (leadUpdated:false) leads:', after);

  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
