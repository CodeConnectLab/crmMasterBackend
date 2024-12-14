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
    required: true
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
  leadLostReasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostReason',
    required: false
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