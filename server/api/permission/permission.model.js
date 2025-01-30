const mongoose = require('mongoose');
const { featurePermissions } = require('../../config/constants/featureConfig');
const mongooseDelete = require('mongoose-delete'); // Ensure this is installed

const permissionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Company'
    },
    role: {
      type: String,
      required: true
    },
    features: [
      {
        name: {
          type: String,
          required: true,
          enum: Object.keys(featurePermissions)
        },
        permissions: {
          add: { type: Boolean, default: false },
          edit: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
          view: { type: Boolean, default: false }
        }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true } // Enable timestamps
);

// Fix incorrect index (remove `name` field as it's not present at root)
permissionSchema.index({ companyId: 1, role: 1 }, { unique: true });

// Add soft delete plugin
permissionSchema.plugin(mongooseDelete, {
  deletedAt: true,
  deletedBy: true,
});

// Fix incorrect model export
const Permission = mongoose.models.Permissions || mongoose.model('Permissions', permissionSchema);

module.exports = Permission;
