/**
 * Enrich the [RECOVERED] leads with agent + (best-effort) name & contact number.
 *
 * Recovered leads have comments/status/followup (re-linked history) but no
 * assignedAgent / firstName / contactNumber. This script backfills them:
 *
 *   1. assignedAgent  — RELIABLE: taken from leadHistory.commentedBy (who wrote
 *                       the comment). This is exact, not a guess.
 *   2. contactNumber  — BEST-EFFORT: the deleted lead was a duplicate of a
 *      + firstName       surviving lead by phone. We find it by matching the
 *                        commenting agent + comment time against callhistories
 *                        (phoneNumber, callerName), then CONFIRM the phone
 *                        against a surviving lead. Confidence is reported.
 *
 * Confidence levels for name/phone:
 *   HIGH   — agent made a call near the comment time AND that phone matches an
 *            existing (surviving) lead for the company. Name taken from survivor.
 *   MEDIUM — agent made exactly one nearby call, but phone not found on a lead.
 *   LOW    — multiple/ambiguous nearby calls.
 *   NONE   — no nearby call for that agent.
 *
 * SAFETY: dry-run by default (only writes a CSV report). --apply writes fields.
 *   By default --apply only writes HIGH-confidence name/phone; pass --include-medium
 *   to also write MEDIUM. assignedAgent is always written on --apply.
 *
 * Usage:
 *   node server/migrations/enrich-recovered-leads.js --company=69d4786b6a13471034370e79
 *   node server/migrations/enrich-recovered-leads.js --company=69d4786b6a13471034370e79 --apply
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
const INCLUDE_MEDIUM = args.includes('--include-medium');
const WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // ±2 days between comment and call

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

async function run() {
  if (!MONGODB_URI) { console.error('❌ MONGO URI not set.'); process.exit(1); }
  const companyId = new mongoose.Types.ObjectId(COMPANY_ID);

  console.log('🔗 Enrich recovered leads (agent + best-effort name/phone)');
  console.log(`   Company : ${COMPANY_ID}`);
  console.log(`   Mode    : ${APPLY ? '⚠️ APPLY' : 'DRY-RUN (CSV report only)'}`);
  console.log(`   Name/phone written on apply: HIGH${INCLUDE_MEDIUM ? ' + MEDIUM' : ''}\n`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const leads = db.collection('leads');
  const history = db.collection('leadhistories');
  const calls = db.collection('callhistories');
  const users = db.collection('users');

  // The recovered shells we created.
  const recovered = await leads.find({
    companyId,
    description: { $regex: /^\[RECOVERED\]/ },
  }).toArray();

  if (recovered.length === 0) {
    console.log('No [RECOVERED] leads found. Nothing to enrich.');
    await mongoose.connection.close();
    return;
  }
  console.log(`Found ${recovered.length} recovered leads to enrich.\n`);

  // Cache users for readable agent names.
  const userDocs = await users.find({ companyId }, { projection: { name: 1, email: 1 } }).toArray();
  const userName = new Map(userDocs.map((u) => [String(u._id), u.name || u.email || String(u._id)]));

  const rows = [];
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
  const updates = [];

  for (const lead of recovered) {
    // History for this lead → agent(s) + comment times.
    const h = await history.find({ leadId: lead._id }).sort({ date: 1 }).toArray();
    if (h.length === 0) continue;

    // Most frequent commenter = the working agent.
    const byUser = {};
    h.forEach((r) => { if (r.commentedBy) byUser[String(r.commentedBy)] = (byUser[String(r.commentedBy)] || 0) + 1; });
    const agentId = Object.keys(byUser).sort((a, b) => byUser[b] - byUser[a])[0];
    const commentDates = h.map((r) => r.date).filter(Boolean);

    // Candidate calls: same company, by that agent, near any comment time.
    let candidates = [];
    if (agentId && commentDates.length) {
      const minT = new Date(Math.min(...commentDates.map((d) => +new Date(d))) - WINDOW_MS);
      const maxT = new Date(Math.max(...commentDates.map((d) => +new Date(d))) + WINDOW_MS);
      candidates = await calls.find({
        companyId,
        userId: new mongoose.Types.ObjectId(agentId),
        timestamp: { $gte: minT, $lte: maxT },
        phoneNumber: { $nin: [null, ''] },
      }).toArray();
    }

    // For each candidate phone, does a surviving lead have it? (strong confirmation)
    let best = null; // { phone, name, confidence, source }
    if (candidates.length) {
      const phones = [...new Set(candidates.map((c) => String(c.phoneNumber).trim()))];
      const survivors = await leads.find({
        companyId,
        contactNumber: { $in: phones },
        _id: { $ne: lead._id },
      }, { projection: { contactNumber: 1, firstName: 1, email: 1 } }).toArray();
      const survivorByPhone = new Map(survivors.map((s) => [String(s.contactNumber).trim(), s]));

      const confirmed = candidates.filter((c) => survivorByPhone.has(String(c.phoneNumber).trim()));
      if (confirmed.length) {
        // Pick the confirmed call closest to a comment time.
        confirmed.sort((a, b) => closeness(a, commentDates) - closeness(b, commentDates));
        const c = confirmed[0];
        const s = survivorByPhone.get(String(c.phoneNumber).trim());
        best = {
          phone: String(c.phoneNumber).trim(),
          name: s.firstName || c.callerName || '',
          email: s.email || '',
          confidence: 'HIGH',
        };
      } else if (phones.length === 1) {
        const c = candidates[0];
        best = { phone: phones[0], name: c.callerName || '', email: '', confidence: 'MEDIUM' };
      } else {
        best = { phone: '', name: '', email: '', confidence: 'LOW' };
      }
    } else {
      best = { phone: '', name: '', email: '', confidence: 'NONE' };
    }

    counts[best.confidence]++;
    rows.push({
      leadId: String(lead._id),
      agent: agentId ? userName.get(agentId) || agentId : '',
      agentId: agentId || '',
      comments: h.length,
      lastComment: h[h.length - 1].comment || '',
      matchedPhone: best.phone,
      matchedName: best.name,
      confidence: best.confidence,
    });

    // Build the update.
    const set = {};
    if (agentId) set.assignedAgent = new mongoose.Types.ObjectId(agentId);
    const writeNamePhone = best.confidence === 'HIGH' || (INCLUDE_MEDIUM && best.confidence === 'MEDIUM');
    if (writeNamePhone && best.phone) {
      set.contactNumber = best.phone;
      if (best.name) set.firstName = best.name;
      if (best.email) set.email = best.email;
    }
    if (Object.keys(set).length) updates.push({ _id: lead._id, set });
  }

  // Write CSV report.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(__dirname, `enrich-recovered-leads.${stamp}.csv`);
  const header = ['leadId', 'agent', 'agentId', 'comments', 'confidence', 'matchedPhone', 'matchedName', 'lastComment'];
  const csv = [header.join(',')]
    .concat(rows.map((r) => [r.leadId, r.agent, r.agentId, r.comments, r.confidence, r.matchedPhone, r.matchedName, r.lastComment].map(csvCell).join(',')))
    .join('\n');
  fs.writeFileSync(csvPath, csv);

  console.log('📊 Match results (name/phone confidence):');
  console.log(`   HIGH   (phone confirmed on a surviving lead) : ${counts.HIGH}`);
  console.log(`   MEDIUM (single nearby call, unconfirmed)     : ${counts.MEDIUM}`);
  console.log(`   LOW    (ambiguous)                           : ${counts.LOW}`);
  console.log(`   NONE   (no nearby call)                      : ${counts.NONE}`);
  console.log(`   Agent backfill available for                 : ${updates.filter((u) => u.set.assignedAgent).length}`);
  console.log(`\n   CSV report: ${csvPath}\n`);

  if (!APPLY) {
    console.log('🟡 DRY-RUN. No DB writes. Review the CSV, then re-run with --apply.');
    await mongoose.connection.close();
    return;
  }

  let agentWrites = 0, contactWrites = 0;
  for (const u of updates) {
    await leads.updateOne({ _id: u._id }, { $set: u.set });
    if (u.set.assignedAgent) agentWrites++;
    if (u.set.contactNumber) contactWrites++;
  }
  console.log(`✅ Applied. assignedAgent set on ${agentWrites} leads; name/phone set on ${contactWrites} leads.`);
  await mongoose.connection.close();
  console.log('\n🏁 Done.');
}

function closeness(call, dates) {
  const t = +new Date(call.timestamp);
  return Math.min(...dates.map((d) => Math.abs(t - +new Date(d))));
}

run().catch(async (err) => {
  console.error('💥 Error:', err.message || err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
