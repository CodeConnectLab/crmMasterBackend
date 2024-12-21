const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: String,
  filePath: String,
  codinates: {
    type: String,
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Company'
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Lead'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes
locationSchema.index({ companyId: 1, leadId: 1 });
locationSchema.index({ createdAt: -1 });

const GeoLocation = mongoose.model('geoLocation', locationSchema);

module.exports = GeoLocation;