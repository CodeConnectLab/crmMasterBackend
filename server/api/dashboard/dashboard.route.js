'use strict'

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./dashboard.controller'),
  auth = require('../auth/auth.service'),
//   validationInputs = require('./dashboard.validation.js'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }


// ////get all calander data
router.get(
  usersVersion + '/calendar',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.getCalendarData
)



module.exports = router;