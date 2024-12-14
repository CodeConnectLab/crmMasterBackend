const Joi = require('joi');
const  mongoose  = require('mongoose');
const leadBaseSchema = {
  firstName: Joi.string()
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.empty': 'First name cannot be empty',
      'string.base': 'First name must be a string'
    }),

  lastName: Joi.string()
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.empty': 'Last name cannot be empty',
      'string.base': 'Last name must be a string'
    }),

  email: Joi.string()
    .email({ 
      minDomainSegments: 2,
      tlds: { allow: true }
    })
    .allow('')
    .optional()
    .pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.pattern.base': 'Please enter a valid email address',
      'string.base': 'Email must be a string'
    }),

  contactNumber: Joi.string(),
  // .trim()
  // .pattern(/^[0-9]\d{9}$/)
  // .allow('')
  // .optional()
  // .messages({
  //   'string.pattern.base': 'Contact number must be a 10-digit number starting with 6-9',
  //   'string.empty': 'Contact number cannot be empty',
  //   'string.base': 'Contact number must be a string'
  // }),

  alternatePhone: Joi.string()
    .trim()
    .pattern(/^[0-9]\d{9}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Alternate phone must be a 10-digit number starting with 6-9',
      'string.empty': 'Alternate phone cannot be empty',
      'string.base': 'Alternate phone must be a string'
    }),

  leadSource: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Invalid lead source ID format',
      'string.base': 'Lead source must be a string'
    }),

  productService: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Invalid product service ID format',
      'string.base': 'Product service must be a string'
    }),

  assignedAgent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Invalid assigned agent ID format',
      'string.base': 'Assigned agent must be a string'
    }),

  leadStatus: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Invalid lead status ID format',
      'string.base': 'Lead status must be a string'
    }),

  followUpDate: Joi.date()
    .allow(null)
    .optional()
    .messages({
      'date.base': 'Follow up date must be a valid date'
    }),

  description: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'Description must be a string'
    }),

  fullAddress: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'Full address must be a string'
    }),

  website: Joi.string()
    .uri()
    .allow('')
    .optional()
    .messages({
      'string.uri': 'Website must be a valid URL',
      'string.base': 'Website must be a string'
    }),

  companyName: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'Company name must be a string'
    }),

  country: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'Country must be a string'
    }),

  state: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'State must be a string'
    }),

  city: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'City must be a string'
    }),

  pinCode: Joi.string()
    .pattern(/^\d{6}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Pin code must be a 6-digit number',
      'string.base': 'Pin code must be a string'
    }),

  leadCost: Joi.number()
    .allow(null)
    .optional()
    .messages({
      'number.base': 'Lead cost must be a number'
    })
};

const validationOptions = {
  abortEarly: false,    // Returns all errors
  allowUnknown: true,   // Allows object to contain unknown keys
  stripUnknown: true    // Removes unknown keys from validated data
};
  // create lead validation
exports.validateLead = {
  body: Joi.object(leadBaseSchema)
};
  ////////update lead validation
exports.validateUpdateLead = {
  body: Joi.object({
    ...leadBaseSchema,
    comment: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Comment cannot exceed 1000 characters',
        'string.base': 'Comment must be a string'
      })
  }),
  addCalender:Joi.boolean().optional(),
  leadWonAmount: Joi.number()
  .allow(null)
  .optional()
  .messages({
    'number.base': 'Lead cost must be a number'
  }),
  leadLostReasonId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Invalid lead Loss ID format',
      'string.base': 'Lead Loss must be a string'
    }),

};

/////  comented by lead validationn lead history
exports.validateLeadHistory = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .required()
      .custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return helpers.error('Invalid status ID format');
        }
        return value;
      })
      .messages({
        'any.required': 'Status is required',
        'string.empty': 'Status cannot be empty'
      }),
      
    // followupDate: Joi.string()
    //   .required()
    //   .isoDate()
    //   .messages({
    //     'string.isoDate': 'Follow-up date must be a valid date'
    //   }),

      followUpDate: Joi.date()
      .required()
      .optional()
      .messages({
        'date.base': 'Follow up date must be a valid date'
      }),

    comment: Joi.string()
      .required()
      .max(1000)
      .messages({
        'string.max': 'Comment cannot exceed 1000 characters'
      })
  });

  return schema.validate(data);
};


// Helper function to validate phone numbers
exports.validatePhoneNumber = (phone) => {
  const phoneRegex = /^[0-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Helper function to validate email
exports.validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Middleware for validation
// exports.joiValidateLead = function(schema) {
//   return async function(req, res, next) {
//     try {
//       // Clean up input data
//       if (req.body.contactNumber) {
//         req.body.contactNumber = req.body.contactNumber.replace(/\s+/g, '');
//       }
//       if (req.body.alternatePhone) {
//         req.body.alternatePhone = req.body.alternatePhone.replace(/\s+/g, '');
//       }
//       if (req.body.email) {
//         req.body.email = req.body.email.trim().toLowerCase();
//       }

//       const result = schema.body.validate(req.body, validationOptions);

//       if (result.error) {
//         return res.status(400).json({
//           error: true,
//           message: 'Validation failed',
//           errors: result.error.details.map(detail => ({
//             field: detail.path.join('.'),
//             message: detail.message
//           }))
//         });
//       }

//       req.body = result.value;
//       next();
//     } catch (error) {
//       return res.status(500).json({
//         error: true,
//         message: 'Validation processing failed',
//         data: {}
//       });
//     }
//   };
// };