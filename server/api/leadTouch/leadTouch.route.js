'use strict';

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./leadTouch.controller'),
  auth = require('../auth/auth.service'),
  validationInputs = require('./leadTouch.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };

// Record a Call / WhatsApp / Email tap on a specific lead.
router.post(
  usersVersion + '/lead/:id/touch',
  auth.isAuthenticated({}),
  joiValidate(validationInputs.validateTouch, options),
  controller.recordTouch
);

// Engagement-per-day report. Manager + employee views.
router.get(
  usersVersion + '/reports/engagement-per-day',
  auth.isAuthenticated({}),
  joiValidate(validationInputs.validateEngagementReport, options),
  controller.engagementPerDay
);

module.exports = router;
