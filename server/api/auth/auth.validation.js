const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);



exports.validateLogIn = {
  body: Joi.object({
    email: Joi.string()
      .messages({
        'string.base': 'email must be a string',
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
      })
      .email(),
    fcmMobileToken:Joi.string().allow('', null).optional(),
    fcmWebToken:Joi.string().allow('', null).optional(),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s-]+$/)
      .messages({
        'string.base': 'phone must be a string',
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Please provide a valid phone number',
      }),

    password: Joi.string()
      .messages({
        'string.base': 'password must be a string',
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty',
      }),

    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .messages({
        'string.base': 'otp must be a string',
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
      }),
  })
    .xor('email', 'phone')
    .xor('password', 'otp')
    .required()
    .messages({
      'object.xor': 'Please provide either email or phone number',
      'object.missing': 'Please provide valid login credentials',
    }),
};




exports.validateImpersonate = {
  body: Joi.object({
    adminEmail: Joi.string().email().required().messages({
      'string.empty': 'Admin email is required',
      'string.email': 'Please provide a valid admin email',
      'any.required': 'Admin email is required',
    }),
    adminPassword: Joi.string().required().messages({
      'string.empty': 'Admin password is required',
      'any.required': 'Admin password is required',
    }),
    target: Joi.string().trim().required().messages({
      'string.empty': 'Target user email or ID is required',
      'any.required': 'Target user email or ID is required',
    }),
    reason: Joi.string().trim().min(3).required().messages({
      'string.empty': 'Reason is required',
      'string.min': 'Reason must be at least 3 characters',
      'any.required': 'Reason is required',
    }),
    fcmMobileToken: Joi.string().allow('', null).optional(),
    fcmWebToken: Joi.string().allow('', null).optional(),
  }),
}

exports.rOTP = {
  body: Joi.object({
      email: Joi.string().required(),
  })
}

exports.verifyOtp = {
  body: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
  })
}

exports.resetPassword={
  body: Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  })
}