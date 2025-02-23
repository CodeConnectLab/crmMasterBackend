const service = require("./user.service")
/// for image
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
///
const { buildSchema } = require("graphql");
const { createHandler } = require("graphql-http/lib/use/express");
const { USER_ROLES } = require("../../config/constants");



exports.createAdminWithCompany = (req, res, next) => {
  return service
    .createAdminWithCompany(req.body, req.user)
    .then((result) => {
      if (result.message === 'Email already exists!') {
         responseHandler.error(res, '', 'Email already exists!', 409)
      } else {
        responseHandler.success(res, result, 'sign up successful!', 200)
      }
    })
    .catch((error) => responseHandler.error(res, error, error.message, 500))
}

exports.createSupportUser = (req, res, next) => {
    return service.createSupportUser(req.body, req.user)
        .then(result => responseHandler.success(res, result, "User Creation successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.userMe = (req, res, next) => {
    return service.userMe(req.user) 
        .then(result => responseHandler.success(res, result, "User fetch successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateMe = (req, res, next) => {
    return service.updateMe(req.body, req.user)
        .then(result => responseHandler.success(res, result, "User update successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateDepartment= (req, res, next) => {
  return service.updateDepartment(req.params.id, req.body, req.user)
  .then(result => responseHandler.success(res, result, "User update successful!", 200))
  .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateProfileImg = (req, res, next) => {
  return service.updateProfileImg(req.body, req.user)
      .then(result => responseHandler.success(res, result, "User Profile image upload successful!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
}
////

//// 
exports.updateUser = (req, res, next) => {
    return service.updateProfile(req.user._id, req.body)
        .then(result => responseHandler.success(res, result, "User update successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.listUsers = (req, res, next) => {
    return service.listUsers({}, req.user)
        .then(result => responseHandler.success(res, result, "User fetch successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.DeleteUser = (req, res, next) => {
    return service.deleteUser(req,req.body, req.user)
        .then(result => responseHandler.success(res, result, "User delete successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateCompanyDetails = (req, res, next) => {
  return service.updateCompanyDetails(req.body,req.user)
      .then(result => responseHandler.success(res, result, "User update successful!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.updateDeviceToken = (req, res, next) => {
  return service.updateDeviceToken(req.body,req.user)
      .then(result => responseHandler.success(res, result, "Device Token update successful!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
}


// exports.listSupport = (req, res, next) => {
//     return service.listUsers({ role: USER_ROLES.SUPPORT }, req.user)
//         .then(result => responseHandler.success(res, result, "Support fetch successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.listSupportAdmin = (req, res, next) => {
//     return service.listUsers({ role: USER_ROLES.SUPPORT_ADMIN }, req.user)
//         .then(result => responseHandler.success(res, result, "Support Admin fetch successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.deleteUser = (req, res, next) => {
//     return service.deleteUser(req.params.id, req.user)
//         .then(result => responseHandler.success(res, result, "User delete successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }

// exports.restoreUser = (req, res, next) => {
//     return service.restoreUser(req.params.id, req.user)
//         .then(result => responseHandler.success(res, result, "User restore successful!", 200))
//         .catch(error => responseHandler.error(res, error, error.message, 500));
// }






