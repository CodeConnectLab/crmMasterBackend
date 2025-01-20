const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")

exports.validateLeadStatus={
    body:Joi.object({
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
      showFollowUp: Joi.boolean().optional(),
      showOutSourced: Joi.boolean().optional(),
      showImported: Joi.boolean().optional()
    }),
};


exports.validateUpdateLeadStatus={
  body:Joi.object({
    name: Joi.string().trim().optional(),
    color:Joi.string().optional(),
    isActive: Joi.boolean().default(true),
    sendNotification: Joi.boolean().optional(),
    wonStatus: Joi.boolean().optional(),
    lossStatus: Joi.boolean().optional(),
    showDashboard: Joi.boolean().optional(),
    showFollowUp: Joi.boolean().optional(),
    showOutSourced: Joi.boolean().optional(),
    showImported: Joi.boolean().optional()
  }),
};

