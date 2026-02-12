const mongoose = require('mongoose');

const facebookAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  facebookAppId: {
    type: String,
    required: true
  },
  facebookAppSecret: {
    type: String,
    required: true
  },
  pageId: {
    type: String,
    required: true
  },
  pageAccessToken: {
    type: String,
    required: true
  },
  pageAccessTokenExpiry: {
    type: Date,
    required: false
  },
  leadFormId: {
    type: String,
    required: true
  },
  webhookUrl: {
    type: String,
    required: true
  },
  verifyToken: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(32).toString('hex')
  },
  // Webhook subscription status
  webhookSubscribed: {
    type: Boolean,
    default: false
  },
  webhookSubscribedAt: {
    type: Date
  },
  webhookSubscribeWarning: {
    type: String,
    required: false
  },
  pageName: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  leadSourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: false
  },
  // Field mapping for custom fields
  fieldMappings: {
    type: Map,
    of: String,
    default: () => new Map([
      ['email', 'email'],
      ['phone_number', 'contactNumber'],
      ['first_name', 'firstName'],
      ['last_name', 'lastName'],
      ['full_name', 'fullName']
    ])
  },
  // Stats
  totalLeadsReceived: {
    type: Number,
    default: 0
  },
  lastWebhookReceived: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for quick lookups - allows multiple lead forms per page
facebookAccountSchema.index({ companyId: 1, pageId: 1, leadFormId: 1 }, { unique: true });
facebookAccountSchema.index({ verifyToken: 1 });

module.exports = mongoose.model('FacebookAccount', facebookAccountSchema);
