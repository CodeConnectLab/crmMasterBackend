const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")

exports.validateLostReason={
    body:Joi.object({
      reason: Joi.string().required().trim().messages({
        'string.empty': 'Reason is required',
        'any.required': 'Reason is required'
      }),
      isActive: Joi.boolean().default(true)
    }),
};

