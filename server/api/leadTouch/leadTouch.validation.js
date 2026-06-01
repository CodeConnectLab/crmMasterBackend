const Joi = require('joi');

exports.validateTouch = {
  body: Joi.object({
    channel: Joi.string()
      .valid('CALL', 'WHATSAPP', 'EMAIL', 'SMS')
      .required()
      .messages({
        'any.only': 'channel must be one of CALL, WHATSAPP, EMAIL, SMS',
        'any.required': 'channel is required',
      }),
    source: Joi.string()
      .valid('MOBILE', 'WEB', 'API')
      .required()
      .messages({
        'any.only': 'source must be one of MOBILE, WEB, API',
        'any.required': 'source is required',
      }),
    intentAt: Joi.date().optional(),
    clientNonce: Joi.string().min(8).max(64).optional(),
    meta: Joi.object({
      appVersion: Joi.string().allow('').optional(),
      platform: Joi.string().allow('').optional(),
      deviceId: Joi.string().allow('').optional(),
      networkType: Joi.string().allow('').optional(),
      userAgent: Joi.string().allow('').optional(),
    }).optional(),
  }),
};

exports.validateEngagementReport = {
  query: {
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional(),
    teamLeaderId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional(),
  },
};
