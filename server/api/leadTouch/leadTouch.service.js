const mongoose = require('mongoose');
const { Types } = mongoose;
const LeadTouch = require('./leadTouch.model');
const Lead = require('../lead/lead.model');
const User = require('../user/user.model');
const userRoles = require('../../config/constants/userRoles');

/**
 * Visibility check — an employee can only touch leads assigned to them; a TL
 * can touch their own + their team's; Super Admin can touch any company lead.
 * Mirrors lead.service.userCanAccessLeadDoc but is duplicated here to avoid
 * circular requires.
 */
async function userCanAccessLead(lead, user) {
  if (!lead || !user?.companyId) return false;
  if (lead.companyId?.toString?.() !== user.companyId.toString()) return false;
  if (user.role === userRoles.SUPER_ADMIN) return true;

  const agentId =
    lead.assignedAgent && lead.assignedAgent._id
      ? lead.assignedAgent._id
      : lead.assignedAgent;

  if (user.role === userRoles.USER) {
    return !!agentId && agentId.toString() === user._id.toString();
  }
  if (user.role === userRoles.TEAM_ADMIN) {
    if (!agentId) return false;
    if (agentId.toString() === user._id.toString()) return true;
    const isTeamMember = await User.exists({
      _id: agentId,
      assignedTL: user._id,
    });
    return !!isTeamMember;
  }
  return false;
}

/**
 * Record a touch (tap on Call / WhatsApp / Email / SMS).
 *
 * Idempotent on clientNonce so an offline mobile queue flushing the same touch
 * twice will return the existing row instead of creating a duplicate.
 *
 * Also bumps Lead.lastTouchAt for the heat-map and quick-filter use cases.
 */
exports.recordTouch = async (leadId, payload, user) => {
  const { channel, source, intentAt, clientNonce, meta = {} } = payload;

  const lead = await Lead.findOne({ _id: leadId, companyId: user.companyId })
    .select('_id companyId assignedAgent')
    .lean();

  if (!lead) {
    throw { code: 404, message: 'Lead not found' };
  }
  if (!(await userCanAccessLead(lead, user))) {
    throw { code: 404, message: 'Lead not found' };
  }

  // Idempotency: same user + nonce -> return existing.
  if (clientNonce) {
    const existing = await LeadTouch.findOne({
      companyId: user.companyId,
      userId: user._id,
      clientNonce,
    }).lean();
    if (existing) {
      return { touch: existing, deduplicated: true };
    }
  }

  let touch;
  try {
    touch = await LeadTouch.create({
      companyId: user.companyId,
      leadId: lead._id,
      userId: user._id,
      channel,
      source,
      intentAt: intentAt ? new Date(intentAt) : new Date(),
      clientNonce: clientNonce || undefined,
      meta,
    });
  } catch (err) {
    // Duplicate-key race: someone won the insert with the same nonce — fetch & return it.
    if (err && err.code === 11000 && clientNonce) {
      const existing = await LeadTouch.findOne({
        companyId: user.companyId,
        userId: user._id,
        clientNonce,
      }).lean();
      if (existing) return { touch: existing, deduplicated: true };
    }
    throw err;
  }

  // Denormalize a quick pointer to Lead so list views can show "last touched".
  await Lead.updateOne(
    { _id: lead._id },
    { $max: { lastTouchAt: touch.serverTs } }
  );

  return { touch, deduplicated: false };
};

/**
 * Find the most-recent open touch by this user for this lead within the
 * engagement window. Used by lead.service to link a comment update back to
 * its triggering tap so we can grade engagement as "Verified" vs "Low confidence".
 *
 * @param {number} windowMs default 30 min
 */
exports.findOpenTouchForEngagement = async (
  { companyId, userId, leadId, clientNonce },
  windowMs = 30 * 60 * 1000
) => {
  const since = new Date(Date.now() - windowMs);

  // Prefer explicit nonce match (mobile flow passes it through QuickUpdate).
  if (clientNonce) {
    const byNonce = await LeadTouch.findOne({
      companyId,
      userId,
      clientNonce,
    });
    if (byNonce) return byNonce;
  }

  return LeadTouch.findOne({
    companyId,
    userId,
    leadId,
    outcome: 'INITIATED',
    serverTs: { $gte: since },
  }).sort({ serverTs: -1 });
};

/**
 * Mark a touch ENGAGED and attach its follow-up LeadHistory.
 * Idempotent — calling twice is harmless.
 */
exports.markTouchEngaged = async (touchId, leadHistoryId) => {
  if (!touchId) return null;
  return LeadTouch.findByIdAndUpdate(
    touchId,
    {
      $set: { outcome: 'ENGAGED', followUpHistoryId: leadHistoryId },
    },
    { new: true }
  );
};

/**
 * Engagement-per-day report: how many distinct leads each employee genuinely
 * contacted on each day, with per-channel breakdown.
 *
 * Source of truth = LeadHistory rows where isEngagement = true (i.e. comment exists).
 * Touches (LeadTouch) are joined in to attribute a channel where available; rows
 * with no linked touch are bucketed under 'OTHER' (typical for web users who
 * called from a desk phone and then updated the lead).
 *
 * Visibility:
 *  - SUPER_ADMIN: all users in company
 *  - TEAM_ADMIN:  self + assigned team
 *  - USER:        self only
 */
exports.getEngagementPerDay = async (params, user) => {
  const { from, to, userId, teamLeaderId } = params;

  if (!user?.companyId) throw new Error('Invalid user');

  const companyOid = new Types.ObjectId(user.companyId);
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to) : new Date();
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  // Build the user-scope filter.
  const userFilter = {};
  if (user.role === userRoles.USER) {
    userFilter.commentedBy = user._id;
  } else if (user.role === userRoles.TEAM_ADMIN) {
    const teamIds = await User.distinct('_id', { assignedTL: user._id });
    userFilter.commentedBy = { $in: [user._id, ...teamIds] };
  } else if (userId) {
    userFilter.commentedBy = new Types.ObjectId(userId);
  } else if (teamLeaderId && user.role === userRoles.SUPER_ADMIN) {
    const teamIds = await User.distinct('_id', { assignedTL: teamLeaderId });
    userFilter.commentedBy = {
      $in: [new Types.ObjectId(teamLeaderId), ...teamIds],
    };
  }

  const LeadHistory = require('../lead/leadHistory.model');

  const rows = await LeadHistory.aggregate([
    {
      $match: {
        companyId: companyOid,
        isEngagement: true,
        date: { $gte: start, $lte: end },
        ...userFilter,
      },
    },
    {
      $lookup: {
        from: 'leadtouches',
        localField: 'touchId',
        foreignField: '_id',
        as: 'touch',
      },
    },
    {
      $project: {
        commentedBy: 1,
        leadId: 1,
        day: {
          $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
        },
        channel: {
          $ifNull: [{ $arrayElemAt: ['$touch.channel', 0] }, 'OTHER'],
        },
        source: 1,
        hasTouch: { $gt: [{ $size: '$touch' }, 0] },
      },
    },
    {
      $group: {
        _id: { userId: '$commentedBy', day: '$day' },
        engaged: { $sum: 1 },
        verified: { $sum: { $cond: ['$hasTouch', 1, 0] } },
        uniqueLeads: { $addToSet: '$leadId' },
        byChannel: {
          $push: '$channel',
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        userName: '$user.name',
        day: '$_id.day',
        engaged: 1,
        verified: 1,
        lowConfidence: { $subtract: ['$engaged', '$verified'] },
        uniqueLeads: { $size: '$uniqueLeads' },
        byChannel: 1,
      },
    },
    { $sort: { day: -1, engaged: -1 } },
  ]);

  // Fold the per-row channel arrays into counted maps for the client.
  return rows.map((r) => {
    const counts = r.byChannel.reduce((acc, ch) => {
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    }, {});
    return { ...r, byChannel: counts };
  });
};
