const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")

exports.validateLeadStatus={
    body:Joi.object({
      // displayName: Joi.string().required().trim().messages({
      //   'string.empty': 'Display name is required',
      //   'any.required': 'Display name is required'
      // }),
      name: Joi.string().required().trim().messages({
        'string.empty': 'Status name is required',
        'any.required': 'Status name is required'
      }),
      color:Joi.string().optional(),
      isActive: Joi.boolean().default(true),
      sendNotification: Joi.boolean().optional(),
      wonStatus: Joi.boolean().optional(),
      lossStatus: Joi.boolean().optional(),
      showDashboard: Joi.boolean().optional(),
      showFollowUp: Joi.boolean().optional()
    }),
};

