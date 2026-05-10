'use strict';

/** Machine-readable codes returned in JSON `error` (string). */
exports.SUBSCRIPTION_ERROR = {
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  USER_LIMIT_EXCEEDED: 'USER_LIMIT_EXCEEDED'
};

exports.SUBSCRIPTION_EXPIRED_MESSAGE =
  'Your subscription has expired. Please renew to continue.';

exports.USER_LIMIT_EXCEEDED_MESSAGE =
  'You have reached your user limit. Please upgrade your plan.';

exports.HTTP_FORBIDDEN = 403;
exports.HTTP_CONFLICT = 409;
