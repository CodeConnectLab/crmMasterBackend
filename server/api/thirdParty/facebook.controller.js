const service = require('./facebook.service');
const responseHandler = require('../../config/responseHandler');

/**
 * Create simple Facebook account
 */
exports.createSimpleAccount = (req, res, next) => {
  return service.createSimpleAccount(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Simple Facebook account created successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Process simple account and create full Facebook account
 */
exports.processSimpleAccount = (req, res, next) => {
  return service.processSimpleAccount(req.params.id || req.body.id, req.user)
    .then(result => responseHandler.success(res, result, "Facebook account processed successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Verify webhook (GET request from Facebook)
 */
exports.verifyWebhook = async (req, res, next) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📞 Webhook verification received:', {
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge,
      ip: req.ip
    });

    // Verify webhook token
    const challengeResponse = await service.verifyWebhook(token, mode, challenge);

    if (challengeResponse) {
      console.log('✅ Webhook verification successful, returning challenge');
      res.status(200).send(challengeResponse);
    } else {
      console.warn('❌ Webhook verification failed, returning 403');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    responseHandler.error(res, error, error.message, 500);
  }
};

/**
 * Receive webhook (POST request from Facebook)
 */
exports.receiveWebhook = (req, res, next) => {
  // Log incoming webhook
  console.log('📥 Webhook received from Facebook:', {
    object: req.body?.object,
    entryCount: req.body?.entry?.length || 0,
    ip: req.ip
  });

  // Respond immediately to Facebook (within 20 seconds)
  res.status(200).send('OK');

  // Process webhook asynchronously
  service.processWebhookLead(req.body)
    .then(result => {
      console.log('✅ Webhook processed successfully:', result);
    })
    .catch(error => {
      console.error('❌ Error processing webhook:', error);
      // Don't throw - we already sent 200 to Facebook
    });
};

/**
 * Get all simple accounts (pending processing)
 */
exports.getSimpleAccounts = (req, res, next) => {
  return service.getSimpleAccounts(req, req.user)
    .then(result => responseHandler.success(res, result, "Simple accounts retrieved successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Get all Facebook accounts
 */
exports.getFacebookAccounts = (req, res, next) => {
  return service.getFacebookAccounts(req.query.companyId, req.user)
    .then(result => responseHandler.success(res, result, "Facebook accounts retrieved successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Update Facebook account
 */
exports.updateFacebookAccount = (req, res, next) => {
  return service.updateFacebookAccount(req.params.id, req.body, req.user)
    .then(result => responseHandler.success(res, result, "Facebook account updated successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Delete Facebook account
 */
exports.deleteFacebookAccount = (req, res, next) => {
  return service.deleteFacebookAccount(req.params.id)
    .then(result => responseHandler.success(res, result, "Facebook account deleted successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

/**
 * Test Facebook token (for debugging)
 */
exports.testFacebookToken = (req, res, next) => {
  return service.testFacebookToken(req.params.id)
    .then(result => responseHandler.success(res, result, "Token test completed!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};
