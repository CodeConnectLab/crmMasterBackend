'use strict';

const express = require('express'),
  { joiValidate } = require("../../helpers/apiValidation.helper"),
  controller = require('./callHistory.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./callHistory.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };



/////  Add Call history of users
router.post(usersVersion + "/call-history",
    auth.isAuthenticated({
  }),
  joiValidate(validationInputs.validateCallHistory, options),
  controller.saveCallHistory);




  module.exports = router;