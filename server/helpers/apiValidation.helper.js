

const Joi = require('joi');

exports.joiValidate = function (schema, options = {}) {
    return function (req, res, next) {
      const validationOptions = {
        abortEarly: true, // Changed to true to get only first error
        stripUnknown: false, // Changed to false to not strip unknown fields
        ...options,
      };
  


      if (schema.body) {
        const result = schema.body.validate(req.body, validationOptions);
        
        if (result.error) {
          return res.status(400).json({
            error: true,
            message: result.error.details[0].message
          });
        }
  
        req.body = result.value;
      }
  
      if (schema.query) {
        const result = Joi.object(schema.query).validate(req.query, validationOptions);
        
        if (result.error) {
          return res.status(400).json({
            error: true,
            message: result.error.details[0].message
          });
        }
  
        req.query = result.value;
      }
  
      if (schema.params) {
        // Check if schema.params is already a Joi schema or a plain object
        const paramsSchema = schema.params.isJoi ? schema.params : Joi.object(schema.params);
        const result = paramsSchema.validate(req.params, validationOptions);
        
        if (result.error) {
          return res.status(400).json({
            error: true,
            message: result.error.details[0].message
          });
        }
  
        req.params = result.value;
      }
  
      next();
    };
  };





