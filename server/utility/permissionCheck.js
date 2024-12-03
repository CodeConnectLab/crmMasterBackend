// // utils/permissionCheck.js
// const PermissionModel=require('../api/Permission/permission.model');

// const checkPermission = async (role, feature, action) => {
//     const permission = await PermissionModel.findOne({ role });
     
//     if (permission) {
//         // const featurePermission = permission.features.find(f => f.feature === feature);
//         const featurePermission = permission.features.find(f => f.feature.toLowerCase() === feature.toLowerCase());
//         if (featurePermission && featurePermission.actions.get(action)) {
//             return true;
//         }
//         throw new Error(`You do not have permission to ${action} ${feature}.`);
//     } else {
//         throw new Error('Permission not found for user role.');
//     }
// };

// module.exports = checkPermission;
