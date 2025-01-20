const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const LeadStatusSchema = new mongoose.Schema({
  displayName: {
    type: String,
   // required: [true, 'Display name is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Status name is required'],
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    default: '#000000'
  },
  showDashboard: {
    type: Boolean,
    default: true
  },
  showFollowUp: {
    type: Boolean,
    default: true
  },
  showImported: {
    type: Boolean,
    default: true
  },
  showOutSourced	: {
    type: Boolean,
    default: true
  },
  sendNotification: {
    type: Boolean,
    default: false
  },
  wonStatus:{
    type: Boolean,
    default: false
  },
  lossStatus:{
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Add compound index for unique name per company
LeadStatusSchema.index({ name: 1, companyId: 1 }, { unique: true });
LeadStatusSchema.index({ order: 1, companyId: 1 });

// Add plugins
LeadStatusSchema.plugin(timestamps);
LeadStatusSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
});

// Check if model exists before creating a new one
const LeadStatus = mongoose.models.LeadStatus || mongoose.model('LeadStatus', LeadStatusSchema);

module.exports = LeadStatus;