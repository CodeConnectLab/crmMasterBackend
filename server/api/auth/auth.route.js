'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./auth.controller'),
     auth1 = require('../auth/auth.service'),
    // activity = require('../activity/activity.json'),
    validationInputs = require('./auth.validation'),
    router = express.Router(),
    auth = '/v1',
    options = {
        wantResponse: true,
    };
    const {validateLogIn} =require('./auth.validation')


    router.post(
        auth + "/signin",
        joiValidate(validateLogIn),
        controller.logIn
      );


    router.post("/auth/logout",
       // auth1.isAuthenticated({logout:true}),
     controller.handleLogout);

router.post(auth + "/refresh",
    controller.refresh);


    //////  request to otp for forget password
router.post(auth + "/forget-password/request-otp",
    joiValidate(validationInputs.rOTP, options),
    controller.requestOTP);
//////  otp varification
    router.post(auth + "/forget-password/verify-otp",
        joiValidate(validationInputs.verifyOtp, options),
        controller.verifyOtp);
//////  reset password
    router.post(auth + "/forget-password/reset-password",
        joiValidate(validationInputs.resetPassword, options),
        controller.resetPassword);

module.exports = router;