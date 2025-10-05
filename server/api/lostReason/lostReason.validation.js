const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);


exports.validateLostReason={
    body:Joi.object({
      reason: Joi.string().required().trim().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required'
      }),
      isActive: Joi.boolean().default(true)
    }),
};

