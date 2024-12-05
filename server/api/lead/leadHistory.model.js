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
  }
});

// Check if model exists before compiling
const LeadHistory = mongoose.models.LeadHistory || mongoose.model('LeadHistory', leadHistorySchema);

module.exports = LeadHistory;