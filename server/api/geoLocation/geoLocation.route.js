'use strict'

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./geoLocation.controller'),
  auth = require('../auth/auth.service'),
   validationInputs = require('./geoLocation.validation.js'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }
const { handleFileUpload } = require('../../config/fileUpload.js');



  router.post(
    usersVersion + '/geo-location',
    auth.isAuthenticated({}),
    handleFileUpload,
    //  joiValidate(validationInputs.geoLocationUpload, options),
    controller.geoLocationUplode
  );


  module.exports = router;