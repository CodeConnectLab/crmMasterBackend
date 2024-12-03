const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const LeadSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lead source name is required'],
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

// Add compound index for unique name per company
LeadSourceSchema.index({ name: 1, companyId: 1 }, { unique: true });

// Add plugins
LeadSourceSchema.plugin(timestamps);
LeadSourceSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
});

// Check if model exists before creating a new one
const LeadSource = mongoose.models.LeadSource || mongoose.model('LeadSource', LeadSourceSchema);

module.exports = LeadSource;