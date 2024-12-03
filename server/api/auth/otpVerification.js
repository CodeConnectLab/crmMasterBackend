const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  expiryTime: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Check if model exists before creating a new one
const OTPVerification = mongoose.models.OTPVerification || mongoose.model('OTPVerification', otpVerificationSchema);

module.exports = OTPVerification;