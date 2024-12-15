// const Joi = require('joi'),
//   { USER_ROLES } = require("../../config/constants");
// Joi.objectId = require('joi-objectid')(Joi);
// const activites = require("../activity/activity.json")

// const callHistorySchema = Joi.object({
//   dateTime: Joi.string()
//     .required()
//     .messages({
//       'string.base': 'dateTime must be a string',
//       'string.empty': 'dateTime cannot be empty',
//       'any.required': 'DateTime is required'
//     }),

//   duration: Joi.number()
//     .required()
//     .min(0)
//     .messages({
//       'number.base': 'Duration must be a number',
//       'number.min': 'Duration cannot be negative',
//       'any.required': 'Duration is required'
//     }),

//   name: Joi.string()
//     .optional()
//     .allow('')
//     .messages({
//       'string.base': 'name must be a string',
//       'string.empty': 'Name cannot be empty',
//       'any.required': 'Name is required'
//     }),

//   phoneNumber: Joi.string()
//     .required()
//     .messages({
//       'string.base': 'phoneNumber must be a string',
//       'string.empty': 'Phone number cannot be empty',
//       'any.required': 'Phone number is required'
//     }),

//   rawType: Joi.number()
//     .required()
//     .messages({
//       'number.base': 'rawType must be a number',
//       'any.required': 'Raw type is required'
//     }),

//   timestamp: Joi.string()
//     .required()
//     .messages({
//       'string.base': 'timestamp must be a string',
//       'string.empty': 'Timestamp cannot be empty',
//       'any.required': 'Timestamp is required'
//     }),

//   type: Joi.string()
//     .required()
//     .messages({
//       'string.base': 'type must be a string',
//       'string.empty': 'Type cannot be empty',
//       'any.required': 'Type is required'
//     })
// });

// exports.validateCallHistory = {
//   body: Joi.array().items(callHistorySchema).messages({
//     'array.base': 'Input must be an array'
//   })
// };


const Joi = require('joi');

const callHistorySchema = Joi.object({
  type: Joi.string()
    .required()
    .messages({
      'string.base': 'type must be a string',
      'string.empty': 'Type cannot be empty',
      'any.required': 'Type is required'
    }),

  rawType: Joi.number()
    .required()
    .messages({
      'number.base': 'rawType must be a number',
      'any.required': 'Raw type is required'
    }),

  name: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'name must be a string'
    }),

  duration: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.base': 'Duration must be a number',
      'number.min': 'Duration cannot be negative',
      'any.required': 'Duration is required'
    }),

  dateTime: Joi.string()
    .required()
    .messages({
      'string.base': 'dateTime must be a string',
      'string.empty': 'dateTime cannot be empty',
      'any.required': 'DateTime is required'
    }),

  timestamp: Joi.string()
    .required()
    .messages({
      'string.base': 'timestamp must be a string',
      'string.empty': 'Timestamp cannot be empty',
      'any.required': 'Timestamp is required'
    }),

  phoneNumber: Joi.string()
    .required()
    .messages({
      'string.base': 'phoneNumber must be a string',
      'string.empty': 'Phone number cannot be empty',
      'any.required': 'Phone number is required'
    })
});



exports.validateCallHistory = {
  body: Joi.array().items(callHistorySchema).required().messages({
    'array.base': 'Input must be an array',
    'array.empty': 'Call history array cannot be empty'
  })
};





exports.validateGetCallList = {
  body: Joi.object({
    startDate: Joi.date().required().messages({
      'date.base': 'From date must be a valid date'
    }),
    endDate: Joi.date().required().messages({
      'date.base': 'To date must be a valid date',
      'date.greater': 'To date must be greater than from date'
    }),
    userId: Joi.string().trim().required().messages({
      'string.base': 'User ID must be a string',
      'string.empty': 'User ID cannot be empty'
    })
  })
};


exports.validateProductSaleReport={
    body:Joi.object({
      assignedAgent: Joi.string().optional(),
      leadSource: Joi.string().optional(),
      ProductService: Joi.string().optional(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required().min(Joi.ref('startDate'))
    }),
};

