'use strict';
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TokenSchema = new Schema({
  token: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  tokenType: {
    type: String,
    required: true,
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

TokenSchema.plugin(timestamps);
TokenSchema.plugin(mongooseDelete, {
  deletedBy: true,
  deletedAt: true
});
module.exports = mongoose.model('VerificationToken', TokenSchema);