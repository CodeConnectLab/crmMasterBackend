const Joi = require('joi');

const companyUpdateValidation = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    // .required()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters',
      // 'any.required': 'Company name is required'
    }),

  industry: Joi.string()
    .trim()
    .allow('', null),

  address: Joi.string()
    .trim()
    .allow('', null),

  phone: Joi.string()
    .trim()
    .allow('', null),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .allow('', null)
    .messages({
      'string.email': 'Please provide a valid email'
    }),

  website: Joi.string()
    .trim()
    .allow('', null),

  status: Joi.string()
    .valid('active', 'inactive')
    .default('active'),

  settings: Joi.object({
    dateFormat: Joi.string().default('DD/MM/YYYY'),
    timezone: Joi.string().default('UTC'),
    currency: Joi.string().default('USD'),
    language: Joi.string().default('en'),
    fiscalYearStart: Joi.string().default('01-01')
  }),

  subscription: Joi.object({
    plan: Joi.string()
      .valid('free', 'starter', 'professional', 'enterprise')
      .default('free'),
    startDate: Joi.date().default(Date.now),
    endDate: Joi.date(),
    status: Joi.string()
      .valid('active', 'trial', 'expired')
      .default('trial'),
    features: Joi.array().items(Joi.string())
  }),

  logo: Joi.string()
    .allow('', null),

  size: Joi.number()
   // .valid('small', 'medium', 'large', 'enterprise')
    .allow('', null),

  taxId: Joi.string()
    .trim()
    .allow('', null),

  billingAddress: Joi.string()
    .trim()
    .allow('', null),

  primaryContact: Joi.object({
    name: Joi.string().trim(),
    email: Joi.string().trim().lowercase().email(),
    phone: Joi.string().trim()
  }).allow(null)
});

const validateCompanyUpdate = async (req, res, next) => {
  try {
    await companyUpdateValidation.validateAsync(req.body, { 
      abortEarly: false,
      allowUnknown: true 
    });
    next();
  } catch (error) {
    const errors = error.details.map(detail => ({
      field: detail.context.key,
      message: detail.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
};

module.exports = {
  validateCompanyUpdate
};