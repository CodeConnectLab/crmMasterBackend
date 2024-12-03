const Joi = require('joi'),
  { USER_ROLES } = require("../../config/constants");
Joi.objectId = require('joi-objectid')(Joi);
const activites = require("../activity/activity.json")

exports.validateProductService={
    body:Joi.object({
        name: Joi.string().required().trim().messages({
          'string.empty': 'Product/Service name is required',
          'any.required': 'Product/Service name is required'
        }),
        setupFee: Joi.number().min(0).required().messages({
          'number.base': 'Setup fee must be a number',
          'number.min': 'Setup fee cannot be negative',
          'any.required': 'Setup fee is required'
        }),
        price: Joi.number().min(0).required().messages({
          'number.base': 'Price must be a number',
          'number.min': 'Price cannot be negative',
          'any.required': 'Price is required'
        }),
        isActive: Joi.boolean().default(true)
      }),
};

exports.validateUpdateProductService = {
    body: Joi.object({
      name: Joi.string()
        .trim()
        .optional()
        .messages({
          'string.empty': 'Name cannot be empty if provided'
        }),
  
      setupFee: Joi.number()
        .min(0)
        .optional()
        .messages({
          'number.base': 'Setup fee must be a number',
          'number.min': 'Setup fee cannot be negative'
        }),
  
      price: Joi.number()
        .min(0)
        .optional()
        .messages({
          'number.base': 'Price must be a number',
          'number.min': 'Price cannot be negative'
        })
    })
  };
