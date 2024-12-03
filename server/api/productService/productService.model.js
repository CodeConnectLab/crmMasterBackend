const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

const ProductServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product/Service name is required'],
    trim: true
  },
  setupFee: {
    type: Number,
    required: [true, 'Setup fee is required'],
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    default: 0
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Add compound index for unique name per company
ProductServiceSchema.index({ name: 1, companyId: 1 }, { unique: true });
ProductServiceSchema.index({ order: 1, companyId: 1 });

// Add plugins
ProductServiceSchema.plugin(timestamps);
ProductServiceSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
});

// Check if model exists before creating a new one
const ProductService = mongoose.models.ProductService || mongoose.model('ProductService', ProductServiceSchema);

module.exports = ProductService;