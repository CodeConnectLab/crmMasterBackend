
const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  callType: {
    type: String,
  },
  rawType: {
    type: Number,
    required: true
  },
  callerName: {
    type: String,
    //required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
   // required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  dateTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for preventing duplicates
callHistorySchema.index(
  {
    companyId: 1,
    userId: 1,
    phoneNumber: 1,
    timestamp: 1,
    callType: 1
  },
  { unique: true }
);
module.exports = mongoose.models.CallHistory || mongoose.model('CallHistory', callHistorySchema);

