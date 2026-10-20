'use strict';
const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const { Schema } = mongoose;

/**
 * Audit trail for the Platform Admin "login as any user" (impersonation) flow.
 * One record is written whenever an admin starts impersonating a user, and
 * another when the impersonation session is explicitly exited.
 */
const ImpersonationLogSchema = new Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminEmail: {
    type: String,
    trim: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetEmail: {
    type: String,
    trim: true
  },
  targetCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company'
  },
  reason: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    enum: ['login', 'exit'],
    default: 'login'
  },
  ipAddress: {
    type: String
  }
});

ImpersonationLogSchema.plugin(timestamps);
ImpersonationLogSchema.plugin(mongooseDelete, {
  deletedBy: true,
  deletedAt: true
});

module.exports =
  mongoose.models.ImpersonationLog ||
  mongoose.model('ImpersonationLog', ImpersonationLogSchema);
