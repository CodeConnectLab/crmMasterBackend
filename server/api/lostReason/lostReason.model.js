const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const LostReasonSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: [true, 'Reason is required'],
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

// Add compound index for unique reason per company
LostReasonSchema.index({ reason: 1, companyId: 1 }, { unique: true });
LostReasonSchema.index({ order: 1, companyId: 1 });

// Add plugins
LostReasonSchema.plugin(timestamps);
LostReasonSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
});

// Check if model exists before creating a new one
const LostReason = mongoose.models.LostReason || mongoose.model('LostReason', LostReasonSchema);

module.exports = LostReason;