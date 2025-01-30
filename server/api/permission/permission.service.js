// const permissionModel = require('./permission.model');
// const { featurePermissions } = require('../../config/constants/featureConfig');

// exports.getAllFeatureList = async ({},user) => {
//     try {
//       if (!user?.companyId) {
//         throw new Error('Company ID is required');
//       }
  
//       const getPermissionList= permissionModel.find({
//         companyId: user.companyId,
//         role: user.role
//       });
//       if(getPermissionList){
//         return getPermissionList;
//       }else{
//         return featurePermissions;
//       }
  
//     } catch (error) {
//       return Promise.reject(error);
//     }
//   };

// // Creat/Update role permissions for a company
// exports.createPermissions= async({},user)=>{
    
// }  

// permission.service.js
const permissionModel = require('./permission.model');
const { featurePermissions } = require('../../config/constants/featureConfig');

// Helper function to create default permissions object
const createDefaultFeaturePermissions = () => {
    return Object.keys(featurePermissions).map(featureKey => {
        const feature = featurePermissions[featureKey];
        return {
            name: feature.name,
            permissions: {
                add: feature.availablePermissions.includes('add') ? false : undefined,
                edit: feature.availablePermissions.includes('edit') ? false : undefined,
                delete: feature.availablePermissions.includes('delete') ? false : undefined,
                view: feature.availablePermissions.includes('view') ? false : undefined
            }
        };
    });
};

exports.getAllFeatureList = async ({}, user) => {
    try {
        if (!user?.companyId) {
            throw new Error('Company ID is required');
        }

        // Find existing permissions
        const existingPermissions = await permissionModel.findOne({
            companyId: user.companyId,
            role: user.role
        });

        if (existingPermissions) {
            return existingPermissions;
        }

        // If no permissions exist, return default structure with all permissions set to false
        return {
            features: createDefaultFeaturePermissions()
        };
    } catch (error) {
        return Promise.reject(error);
    }
};

exports.createPermissions = async ({ features }, user) => {
    try {
        if (!user?.companyId) {
            throw new Error('Company ID is required');
        }

        // Validate features against available permissions
        for (const feature of features) {
            const configFeature = featurePermissions[feature.name];
            if (!configFeature) {
                throw new Error(`Invalid feature: ${feature.name}`);
            }

            // Check permissions against availablePermissions
            for (const [perm, isEnabled] of Object.entries(feature.permissions)) {
                // Skip if permission is false or undefined
                if (!isEnabled) continue;

                // Check if enabled permission is allowed
                if (!configFeature.availablePermissions.includes(perm)) {
                    throw new Error(`Permission '${perm}' is not available for feature '${feature.name}'`);
                }
            }

            // Ensure only available permissions are included
            for (const perm of ['add', 'edit', 'delete', 'view']) {
                if (!configFeature.availablePermissions.includes(perm)) {
                    feature.permissions[perm] = undefined;
                }
            }
        }

        // Ensure all features are included
        const allFeatures = new Set(Object.keys(featurePermissions));
        const providedFeatures = new Set(features.map(f => f.name));
        
        // Add missing features with default permissions
        const defaultFeatures = createDefaultFeaturePermissions();
        for (const defaultFeature of defaultFeatures) {
            if (!providedFeatures.has(defaultFeature.name)) {
                features.push(defaultFeature);
            }
        }

        // Check if permissions exist
        const existingPermissions = await permissionModel.findOne({
            companyId: user.companyId,
            role: user.role
        });

        let result;
        if (existingPermissions) {
            // Update existing permissions
            result = await permissionModel.findOneAndUpdate(
                {
                    companyId: user.companyId,
                    role: user.role
                },
                {
                    features,
                    updatedBy: user._id
                },
                { new: true }
            );
        } else {
            // Create new permissions
            const permission = new permissionModel({
                companyId: user.companyId,
                role: user.role,
                features,
                createdBy: user._id
            });
            result = await permission.save();
        }

        return result;
    } catch (error) {
        return Promise.reject(error);
    }
};

exports.checkPermission = async ({ feature, action }, user) => {
    try {
        if (!user?.companyId) {
            throw new Error('Company ID is required');
        }

        // First check if the action is even possible for this feature
        const configFeature = featurePermissions[feature];
        if (!configFeature || !configFeature.availablePermissions.includes(action)) {
            return { hasPermission: false };
        }

        const permission = await permissionModel.findOne({
            companyId: user.companyId,
            role: user.role
        });

        if (!permission) {
            return { hasPermission: false };
        }

        const featurePermission = permission.features.find(f => f.name === feature);
        if (!featurePermission) {
            return { hasPermission: false };
        }

        return {
            hasPermission: featurePermission.permissions[action] || false
        };
    } catch (error) {
        return Promise.reject(error);
    }
};