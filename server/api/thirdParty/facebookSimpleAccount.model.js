const mongoose = require('mongoose');

const facebookSimpleAccountSchema = new mongoose.Schema({
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
  webhookUrl: {
    type: String,
    required: true
  },
  verifyToken: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(32).toString('hex')
  },
  // Store a long-lived user access token (converted and intended to be long-lived)
  userAccessToken: {
    type: String,
    required: true
  },
  // status flags
  processed: {
    type: Boolean,
    default: false
  },
  processedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('FacebookSimpleAccount', facebookSimpleAccountSchema);
