'use strict';

const express = require('express');
const { joiValidate } = require('../../helpers/apiValidation.helper');
const controller = require('./facebook.controller');
const auth = require('../auth/auth.service');
const validationInputs = require('./facebook.validation');
const router = express.Router();
const usersVersion = '/v1';
const options = {
  wantResponse: true
};

/**
 * Create simple Facebook account
 * POST /api/v1/facebook/simple-account
 */
router.post(
  usersVersion + '/facebook/simple-account',
  auth.isAuthenticated({}),
  joiValidate(validationInputs.createSimpleAccount, options),
  controller.createSimpleAccount
);

/**
 * Process simple account and create full Facebook account
 * POST /api/v1/facebook/process-account/:id
 */
router.post(
  usersVersion + '/facebook/process-account/:id',
  auth.isAuthenticated({
    // adminOnly: true // Uncomment if only admins should process accounts
  }),
//   joiValidate(validationInputs.processSimpleAccount, options),
  controller.processSimpleAccount
);

/**
 * Get all simple accounts (pending processing)
 * GET /api/v1/facebook/simple-accounts
 */
router.get(
  usersVersion + '/facebook/simple-accounts',
  auth.isAuthenticated({}),
  controller.getSimpleAccounts
);

/**
 * Get all Facebook accounts
 * GET /api/v1/facebook/accounts
 */
router.get(
  usersVersion + '/facebook/accounts',
  auth.isAuthenticated({}),
  controller.getFacebookAccounts
);

/**
 * Update Facebook account
 * PUT /api/v1/facebook/accounts/:id
 */
router.put(
  usersVersion + '/facebook/accounts/:id',
  auth.isAuthenticated({}),
  joiValidate(validationInputs.updateFacebookAccount, options),
  controller.updateFacebookAccount
);

/**
 * Delete Facebook account
 * DELETE /api/v1/facebook/accounts/:id
 */
router.delete(
  usersVersion + '/facebook/accounts/:id',
  auth.isAuthenticated({}),
  controller.deleteFacebookAccount
);

/**
 * Test Facebook token (for debugging)
 * GET /api/v1/facebook/test-token/:id
 */
router.get(
  usersVersion + '/facebook/test-token/:id',
  auth.isAuthenticated({}),
  controller.testFacebookToken
);

/**
 * Webhook verification (GET) - Facebook will call this to verify webhook
 * GET /api/v1/facebook/webhook
 */
router.get(
  usersVersion + '/facebook/webhook',
  controller.verifyWebhook
);

/**
 * Webhook receiver (POST) - Facebook will send lead events here
 * POST /api/v1/facebook/webhook
 */
router.post(
  usersVersion + '/facebook/webhook',
  controller.receiveWebhook
);

module.exports = router;
