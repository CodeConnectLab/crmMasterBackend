const mongoose = require('mongoose');

const leadHistorySchema = new mongoose.Schema({
  leadId: { 
    type: mongoose.Schema.Types.ObjectId, 
    index: true, 
    required: true, 
    ref: 'Lead' 
  },
  commentedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    index: true, 
    required: true, 
    ref: 'Company' 
  },
  status: { 
    type: mongoose.Schema.Types.ObjectId, 
    index: true, 
    required: true, 
    ref: 'LeadStatus' 
  },
  leadLostReason: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'LostReason'
  },
  followupDate: { 
    type: Date 
  },
  comment: { 
    type: String 
  },
  addCalender: { 
    type: Boolean, 
    default: false 
  },
  wonAmount: {
    type: Number,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Engagement tracking — a history row counts as a real engagement when a comment exists.
  // touchId is set when this update follows an in-app Call/WhatsApp tap within ~30 min.
  isEngagement: {
    type: Boolean,
    default: false,
    index: true
  },
  source: {
    type: String,
    enum: ['MOBILE', 'WEB', 'API'],
    default: 'API'
  },
  touchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadTouch'
  }
});

// Hot query for engagement-per-day report.
leadHistorySchema.index({ companyId: 1, commentedBy: 1, isEngagement: 1, date: -1 });

// Check if model exists before compiling
const LeadHistory = mongoose.models.LeadHistory || mongoose.model('LeadHistory', leadHistorySchema);

module.exports = LeadHistory;