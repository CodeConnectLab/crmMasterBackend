'use strict';

const subscriptionService = require('./subscription.service');
const {
  SUBSCRIPTION_ERROR,
  SUBSCRIPTION_EXPIRED_MESSAGE
} = require('./subscription.constants');

/**
 * Paths under /api where subscription check is skipped (authenticated still required).
 * req.path is route path relative to /api mount.
 */
function isSubscriptionCheckWhitelisted(req) {
  const method = req.method;
  const path = req.path || '';

  if (method === 'GET' && path === '/v1/users/profile') {
    return true;
  }
  return false;
}

async function checkSubscriptionMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.companyId) {
      return next();
    }
    if (isSubscriptionCheckWhitelisted(req)) {
      return next();
    }

    await subscriptionService.verifyActiveForRequest(req.user.companyId);
    return next();
  } catch (err) {
    if (err.code === SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED) {
      return res.status(403).json({
        error: SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED,
        message: err.message || SUBSCRIPTION_EXPIRED_MESSAGE
      });
    }
    return next(err);
  }
}

module.exports = {
  checkSubscriptionMiddleware
};
