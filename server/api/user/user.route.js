'use strict';

const express = require('express'),
  { joiValidate } = require("../../helpers/apiValidation.helper"),
  controller = require('./user.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./user.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };
  const { validateCompanyUpdate } = require('../company/company.validation');
  const { handleFileUpload } = require('../../config/fileUpload.js');


/////  Super Admin(CEO) With Company Register
router.post(usersVersion + "/register",
  joiValidate(validationInputs.validateRegistration, options),
  controller.createAdminWithCompany);


///// User And Team Admin Or TL Registration  
router.post(usersVersion + "/register/users-register",
  auth.isAuthenticated({
    adminOnly: true
  }),
  joiValidate(validationInputs.createSupportUser, options),
  controller.createSupportUser);

///// User Profile Get

router.get(usersVersion + "/users/profile",
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.userMe);

/////  update me
router.put(
  usersVersion + "/users/profile",
  joiValidate(validationInputs.updateMe, options),
  auth.isAuthenticated({}),
  controller.updateMe
)

///////// update Department list by admin
router.put(
  usersVersion + "/updateDepartment/:id",
  joiValidate(validationInputs.updateMe, options),
  auth.isAuthenticated({
    adminOnly: true
  }),
  controller.updateDepartment
)

/////  user profile img uplode 
router.put(
  usersVersion + "/users/profile-img-uplode",
  auth.isAuthenticated({}),
  handleFileUpload,
  controller.updateProfileImg
)



///////  company detail update 
router.put(usersVersion + "/updateCompanyDetails",
  auth.isAuthenticated({
    adminOnly: true
  }),
  validateCompanyUpdate,
  controller.updateCompanyDetails);




router.get(usersVersion + "/users",
  auth.isAuthenticated({
  }),
  controller.listUsers);

router.delete(usersVersion + "/Delete-User", 
  auth.isAuthenticated({
    adminOnly: true 
}),
joiValidate(validationInputs.DeleteUser, options),
controller.DeleteUser)




router.put(
  usersVersion,
  joiValidate(validationInputs.updateMe, options),
  auth.isAuthenticated({}),
  controller.updateMe
)



///////////////  fcmMobileToken && fcmWebToken  update in model
router.put(
  usersVersion + "/update-token",
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.updateDeviceToken
)
 
module.exports = router;