const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  // Facebook lead integration fields
  fbLeadGenId: {
    type: String,
    required: false,
    index: true
  },
  fbLeadGenFormId: {
    type: String,
    required: false
  },
  fbLeadGenAdId: {
    type: String,
    required: false
  },
  fbCompainName: {
    type: String,
    required: false
  },
  campaignName: {
    type: String,
    required: false
  },
  adName: {
    type: String,
    required: false
  },
  // Facebook lead integration fields
  // WhatsApp (Click-to-WhatsApp) lead integration fields.
  // Sent by the WhatsApp panel's CRM bridge. Mongoose runs in strict mode, so these
  // have to exist here or the bridge's payload is silently discarded on save.
  waId: {
    type: String,
    required: false,
    index: true
  },
  // Chat in the WhatsApp panel, for deep-linking from the lead detail page.
  waChatId: {
    type: String,
    required: false
  },
  // Click id Meta mints at the ad tap — needed to report conversions back to Meta.
  waCtwaClid: {
    type: String,
    required: false
  },
  // Ad id when waSourceType is 'ad', post id when it is 'post'.
  waSourceId: {
    type: String,
    required: false
  },
  waSourceType: {
    type: String,
    required: false
  },
  waSourceUrl: {
    type: String,
    required: false
  },
  waAdHeadline: {
    type: String,
    required: false
  },
  waAdBody: {
    type: String,
    required: false
  },
  // The lead's opening WhatsApp message, in their own words.
  waFirstMessage: {
    type: String,
    required: false
  },
  contactNumber: {
    type: String,
    required: false
  },
  leadSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: false
  },
  productService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductService',
    required: false
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  leadStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadStatus',
    required: false
  },
  followUpDate: {
    type: Date
  },
  description: {
    type: String
  },
  fullAddress: {
    type: String
  },
  website: {
    type: String
  },
  companyName: {
    type: String
  },
  country: {
    type: String
  },
  state: {
    type: String
  },
  city: {
    type: String
  },
  pinCode: {
    type: String
  },
  alternatePhone: {
    type: String
  },
  leadCost: {
    type: Number,
    default: 0,
    trim: true,
  },
  leadAddType: {
    type: String,
    required: true,
    default: 'Insert',
    enum: ['Insert', 'Import', 'ThirdParty']
  },
  leadUpdated:{
    type:Boolean,
    default:false
  },
  leadWonAmount: {
    type: Number,
    default: 0,
    trim: true,
  },
  addCalender: {
    type: Boolean,
    trim: true,
    default: false
  },
  calanderMassage: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  leadLostReasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostReason',
    required: false
  },
  // Engagement / touch denormalization — kept on Lead to avoid aggregating per request.
  // Updated by leadTouch.service on each tap and by lead.service on each engagement.
  lastTouchAt: {
    type: Date
  },
  lastEngagedAt: {
    type: Date
  },
  // Map of 'YYYY-MM-DD' -> count of engaged updates that day. Cheap leaderboard reads.
  engagementCountByDay: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
leadSchema.index({ companyId: 1 });
leadSchema.index({ contactNumber: 1 });
// Speeds up the third-party / Facebook lead de-duplication lookup
// (companyId + contactNumber, most-recent first). Non-unique on purpose:
// genuine re-inquiries after the dedup window are allowed as new leads.
leadSchema.index({ companyId: 1, contactNumber: 1, createdAt: -1 });
leadSchema.index({ assignedAgent: 1 });
leadSchema.index({ leadStatus: 1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ productService: 1 });
leadSchema.index({ createdBy: 1 });

// Commented out pre-find middleware for reference
/*
leadSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'leadSource',
      select: 'name'
    },
    {
      path: 'productService',
      select: 'name'
    },
    {
      path: 'leadStatus',
      select: 'name displayName'
    },
    {
      path: 'createdBy',
      select: 'name email'
    }
  ]);
  next();
});
*/

// Check if model exists before creating a new one
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

module.exports = Lead;