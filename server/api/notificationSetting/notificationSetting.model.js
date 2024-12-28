// src/backend/models/NotificationSettings.js
const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  useFollowUpTime: {
    type: Boolean,
    default: true
  },
  notificationCustomTime: [{
    time: {
      type: String,
      required: true,
      // Format: "HH:mm" (24-hour)
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    isEnabled: {
      type: Boolean,
      default: false
    }
  }],
  recipients: {
    admin: {
      type: Boolean,
      default: false
    },
    teamLead: {
      type: Boolean,
      default: false
    },
    regularUser: {
      type: Boolean,
      default: false
    }
  },
  titleTemplate: {
    type: String,
    required: true
  },
  bodyTemplate: {
    type: String,
    required: true
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

// Update timestamp on save
notificationSettingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingSchema);

module.exports = NotificationSettings;

