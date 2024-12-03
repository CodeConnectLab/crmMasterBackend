const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")

exports.validateLeadSources={
    body:Joi.object({
        name: Joi.string().required().trim().messages({
          'string.empty': 'Lead Source is required',
          'any.required': 'Lead Source name is required'
        })
      }),
};

