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

    // Verify webhook token
    const challengeResponse = await service.verifyWebhook(token, mode, challenge);

    if (challengeResponse) {
      res.status(200).send(challengeResponse);
    } else {
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    responseHandler.error(res, error, error.message, 500);
  }
};

/**
 * Receive webhook (POST request from Facebook)
 */
exports.receiveWebhook = (req, res, next) => {
  // Respond immediately to Facebook
  res.status(200).send('OK');

  // Process webhook asynchronously
  service.processWebhookLead(req.body)
    .then(result => {
      console.log('✅ Webhook processed successfully:', result);
    })
    .catch(error => {
      console.error('❌ Error processing webhook:', error);
    });
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
