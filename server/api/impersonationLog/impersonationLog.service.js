'use strict';
const impersonationLogModel = require('./impersonationLog.model');

/**
 * Persist an impersonation audit record. Auditing must never break the
 * impersonation flow itself, so failures are swallowed and logged only.
 */
exports.logImpersonation = async (data) => {
  try {
    return await impersonationLogModel.create(data);
  } catch (error) {
    console.log('Failed to write impersonation audit log:', error);
    return null;
  }
};
