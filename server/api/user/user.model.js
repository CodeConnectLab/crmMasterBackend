// 'use strict';
// const timestamps = require('mongoose-timestamp');
// const mongooseDelete = require('mongoose-delete');
// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const UserSchema = new Schema({
//   email: {
//     type: String,
//     lowercase: true,
//     unique: true,
//     index: true,
//     required: [true, 'User email required']
//   },
//   name:{
//     type: String
//   },
//   phone: {
//     type: String
//   },
//   role: [{
//     type: String,
//     required: [true, 'Role is required']
//   }],
//   hashedPassword: {
//     type: String
//   },
//   passowrdExpiry: {
//     type: Date,
//   },
//   otp: {
//     type: String
//   },
//   otpExpiry: {
//     type: Date
//   },
//   hashSalt: {
//     type: String
//   },
//   isEmailVerified: {
//     type: Boolean,
//     default: false
//   },
//   isMobileVerified: {
//     type: Boolean,
//     default: false
//   },
//   isActive: {
//     type: Boolean,
//     default: false
//   },
//   profilePic: {
//     type: String
//   },
//   resetPasswordToken: {
//     type: String
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   },
//   deviceId: {
//     type: String
//   },
//   targetPlatform:{
//     type: String
//   },
//   deviceToken:{ 
//     type: String
//   },
//   ipaddress:{
//     type: String
//   },
//   isPrime: {
//     type: Boolean,
//     default: false
//   },
//   bmi: {
//     type: Number,
//   },
//   profile: [mongoose.Schema({
//     profileKey: String,
//     response: {
//       responseType: String,
//       value: [{
//         type: String
//       }]
//     },
//     question: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Survey"
//     }
//   }, { _id: false })],
//   filterTags: {
//     include: [{
//       type: String
//     }],
//     exclude: [{
//       type: String
//     }]
//   },
//   activities: [{
//     type: String
//   }]
// });

// UserSchema.plugin(timestamps);
// UserSchema.plugin(mongooseDelete, {
//   deletedBy: true,
//   deletedAt: true
// });
// module.exports = mongoose.model('User', UserSchema);


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
    enum: ['Super Admin', 'User', 'Team Admin'],
    default: 'User'
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
