const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

/**
 * Validation for creating simple account
 */
exports.createSimpleAccount = {
  body: Joi.object().keys({
    companyId: Joi.objectId().optional(),
    accountName: Joi.string().required().trim(),
    facebookAppId: Joi.string().required(),
    facebookAppSecret: Joi.string().required(),
    webhookUrl: Joi.string().uri().required(),
    verifyToken: Joi.string().optional(),
    userAccessToken: Joi.string().required()
  })
};

/**
 * Validation for processing simple account
 */
exports.processSimpleAccount = {
  params: Joi.object().keys({
    id: Joi.objectId().required()
  })
};

/**
 * Validation for updating Facebook account
 */
exports.updateFacebookAccount = {
  body: Joi.object().keys({
    leadSourceId: Joi.objectId().optional(),
    isActive: Joi.boolean().optional(),
    accountName: Joi.string().trim().optional(),
    fieldMappings: Joi.object().optional()
  })
};
