const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")



exports.validateRegistration={
  body: Joi.object({
    companyData: Joi.object({
      name: Joi.string().required().min(2).max(100),
      industry: Joi.string().optional(),
      address: Joi.string().optional(),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      website: Joi.string().optional(),
      size: Joi.string().valid('small', 'medium', 'large', 'enterprise').optional(),
      settings: Joi.object({
        timezone: Joi.string().optional(),
        currency: Joi.string().optional(),
        language: Joi.string().optional()
      }).optional()
    }).required(),
    userData: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required().min(8),
      phone: Joi.string().optional(),
      role: Joi.string().valid('Admin', 'User', 'Manager').default('Admin')
    }).required()
  })
}


exports.createSupportUser = {
  body: Joi.object({
    email: Joi.string().required(),
    role: Joi.string().required().valid(
      USER_ROLES.USER,
      USER_ROLES.TEAM_ADMIN
    ),
    password: Joi.string().allow(null),
    name: Joi.string().allow(null),
    phone: Joi.string().allow(null),
    isActive:Joi.boolean().allow(null)
  })
}

exports.updateMe={
  body:Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    // phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
    //   .messages({
    //     'string.pattern.base': 'Phone number must be 10 digits'
    //   }),
    bio: Joi.string().max(500).optional(),
   // profilePic: Joi.string().uri().optional(),
    // ipaddress: Joi.string().ip().optional(),
    // isPrime: Joi.boolean().optional(),
    // assignedTL: Joi.string().hex().length(24).optional(), // MongoDB ObjectId validation
  }).min(1)
}

// exports.userActivites = {
//   body: {
//     activites: Joi.array().items(
//       Joi.string().valid(
//         ...Object.values(activites)
//       )
//     )
//   }
// }

// exports.adminSetPassword = {
//   body: {
//     userId: Joi.string().required(),
//     password: Joi.string().required()
//   }
// }

// exports.updateMe = {
//   body: {
//     firstName: Joi.string(),
//     lastName: Joi.string(),
//     phone: Joi.string()
//   }
// }