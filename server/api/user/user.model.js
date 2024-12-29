  const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  hashedPassword: {
    type: String
  },
  role: {
    type: String,
    required: true,
    enum: ['Super Admin', 'Employee', 'Team Leader'],
    default: 'Employee'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "company",
    required: true
  },
  phone: {
    type: String,
    unique: true,
    trim: true
  },
  profilePic: {
    type: String
  },
  assignedTL: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  resetPasswordToken: {
    type: String
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  hashSalt: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  ipaddress: {
    type: String
  },
  fcmMobileToken:{
    type: String
  },
  fcmWebToken:{
    type: String
  },
  bio: {
    type: String
  },
  isPrime: {
    type: Boolean,
    default: false
  }
});

// Add plugins
UserSchema.plugin(timestamps);
UserSchema.plugin(mongooseDelete, {
  deletedBy: true,
  deletedAt: true
});

// Export the model
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
