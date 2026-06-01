const mongoose = require('mongoose');

/**
 * LeadTouch
 * Records every time an employee taps Call / WhatsApp / Email / SMS on a lead
 * from any client (mobile or web). One row per tap. Idempotent on `clientNonce`
 * so retries / offline queue flushes do not double-count.
 *
 * Engagement (a real conversation / follow-up) is recorded separately in
 * LeadHistory and back-linked via touchId. A touch with no follow-up history
 * within ~30 min stays as INITIATED.
 */
const leadTouchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['CALL', 'WHATSAPP', 'EMAIL', 'SMS'],
      required: true,
    },
    source: {
      type: String,
      enum: ['MOBILE', 'WEB', 'API'],
      required: true,
    },
    /** Server timestamp is authoritative; intentAt is client-reported for analytics only. */
    intentAt: { type: Date, required: true },
    serverTs: { type: Date, default: Date.now, index: true },
    outcome: {
      type: String,
      enum: ['INITIATED', 'ENGAGED'],
      default: 'INITIATED',
      index: true,
    },
    /** LeadHistory row that proves engagement (filled in when the lead is updated within 30 min). */
    followUpHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadHistory',
    },
    durationSec: { type: Number },
    meta: {
      appVersion: String,
      platform: String, // 'ios' | 'android' | 'web'
      deviceId: String, // hashed install id
      networkType: String,
      userAgent: String,
    },
    /** Idempotency key generated client-side (uuid v4). */
    clientNonce: { type: String, index: true },
  },
  { timestamps: true }
);

// Idempotency: same nonce can't double-count for the same user.
leadTouchSchema.index(
  { companyId: 1, userId: 1, clientNonce: 1 },
  { unique: true, sparse: true }
);
// Hot query: contacts per employee per day.
leadTouchSchema.index({ companyId: 1, userId: 1, serverTs: -1 });
// Hot query: per-lead touch history.
leadTouchSchema.index({ leadId: 1, serverTs: -1 });

const LeadTouch =
  mongoose.models.LeadTouch || mongoose.model('LeadTouch', leadTouchSchema);

module.exports = LeadTouch;
