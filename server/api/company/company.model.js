const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const timestamps = require('mongoose-timestamp');
const mongooseDelete = require('mongoose-delete');

// Create the company schema
const companySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters long'],
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Company code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Company code must be at least 3 characters long'],
    maxlength: [10, 'Company code cannot exceed 10 characters']
  },
  industry: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  website: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  settings: {
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    language: {
      type: String,
      default: 'en'
    },
    fiscalYearStart: {
      type: String,
      default: '01-01'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'expired'],
      default: 'trial'
    },
    features: [{
      type: String
    }]
  },
  logo: {
    type: String
  },
  size: {
    type: Number,
    // enum: ['small', 'medium', 'large', 'enterprise']
  },
  taxId: {
    type: String,
    trim: true
  },
  billingAddress: {
    type: String,
    trim: true
  },
  primaryContact: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Add indexes
companySchema.index({ code: 1 }, { unique: true });
companySchema.index({ name: 1 });
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ createdAt: 1 });

// Add plugins
companySchema.plugin(timestamps);
companySchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
  overrideMethods: true,
  indexFields: ['deleted']
});

// Add methods
companySchema.methods = {
  // Check if company subscription is active
  isSubscriptionActive: function() {
    const now = new Date();
    return (
      this.subscription.status === 'active' &&
      this.subscription.endDate > now
    );
  },

  // Check if company is in trial period
  isInTrialPeriod: function() {
    const now = new Date();
    return (
      this.subscription.status === 'trial' &&
      this.subscription.endDate > now
    );
  },

  // Check if company has specific feature
  hasFeature: function(featureName) {
    return this.subscription.features?.includes(featureName) || false;
  }
};

// Add static methods
companySchema.statics = {
  // Find active companies
  findActive: function() {
    return this.find({ status: 'active', deleted: false });
  },

  // Find by code
  findByCode: function(code) {
    return this.findOne({ code: code.toUpperCase(), deleted: false });
  },

  // Find companies with expired subscriptions
  findExpiredSubscriptions: function() {
    const now = new Date();
    return this.find({
      'subscription.endDate': { $lt: now },
      'subscription.status': { $in: ['active', 'trial'] },
      deleted: false
    });
  }
};

// Add middleware
companySchema.pre('save', function(next) {
  // Convert company code to uppercase
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Create and export the model
const Company = mongoose.models.company || mongoose.model('company', companySchema);

module.exports = Company;