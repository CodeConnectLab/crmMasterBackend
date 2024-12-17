'use strict'

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./thirdParty.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./thirdParty.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }

router.get(
  usersVersion + '/getCurlApi',
  auth.isAuthenticated({
   // adminOnly: true
  }),
  controller.getCurlApi
)

router.post(
    usersVersion + '/outsource-lead',
    // auth.isAuthenticated({
    //  // adminOnly: true
    // }),
    controller.OutsourceLead
  )

module.exports = router
