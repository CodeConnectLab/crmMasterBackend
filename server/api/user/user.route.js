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
// router.put(
//   usersVersion + "/set-password",
//   auth.isAuthenticated({
//    // adminOnly: true
//   }),
//   joiValidate(validationInputs.adminSetPassword, options),
//   controller.adminSetPassword)


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








// router.post(usersVersion + "/activities",
//   auth.isAuthenticated({
//     adminOnly: true
//   }),
//   joiValidate(validationInputs.userActivites, options),
//   controller.createUser);

router.get(usersVersion + "/users",
  auth.isAuthenticated({
  }),
  controller.listUsers);

// router.get(usersVersion + "/support",
//   auth.isAuthenticated({
//     adminOnly: true
//   }),
//   controller.listSupport);

// router.get(usersVersion + "/admin",
//   auth.isAuthenticated({
//     adminOnly: true
//   }),
//   controller.listSupportAdmin);



// router.use(
//   "/v1/user-profile",
//   auth.isAuthenticated({ adminOnly: true }),
//   controller.userProfileGqlSchema
// );

// router.post(usersVersion + "/me",
//   auth.isAuthenticated({}),
//   controller.userProfilemeGqlSchema
// )

// router.put(usersVersion + "/profile-img-uplode",
//   auth.isAuthenticated({}),
//   controller.userProfileimguplode
// )



// router.delete(
//   usersVersion + "/:id",
//   auth.isAuthenticated({
//     adminandsupport: true
//   }),
//   controller.deleteUser
// )

// router.put(
//   usersVersion + "/me",
//   auth.isAuthenticated({
//     // adminOnly: true
//   }),
//   controller.updateUser
// )

router.put(
  usersVersion,
  joiValidate(validationInputs.updateMe, options),
  auth.isAuthenticated({}),
  controller.updateMe
)


// router.put(
//   usersVersion + "/:id/restore",
//   auth.isAuthenticated({
//     // adminOnly: true
//   }),
//   controller.restoreUser
// )

module.exports = router;