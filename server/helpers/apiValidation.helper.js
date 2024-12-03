// const Joi = require('joi');

// exports.joiValidate = function (schema, options) {
//     return function(req, res, next) {

//         let result;
        
//         if(schema.body){
//             //check the req body type
//         if(!Array.isArray(req.body)){
//             let schemaBody = Joi.object(schema.body);
//             result = schemaBody.validate(req.body);

//             if(result.error) {
//                 return responseHandler.error(res, result.error, result.error.message, 500)
//             }
//         }else{
//             let schemaBody = Joi.array().items(Joi.object(schema.body));
//             result = schemaBody.validate(req.body);

//             if(result.error) {
//                 return responseHandler.error(res, result.error, result.error.message, 500)
//             }
//         }
        
//         }
        
        
//         if(schema.query) {
//             let schemaQuery = Joi.object(schema.query);
//             result = schemaQuery.validate(req.query);

//             if(result.error) {
//                 return  responseHandler.error(res, result.error, result.error.message, 500);
//             }
//         }
//         next();
//     }
// }


const Joi = require('joi');

exports.joiValidate = function (schema, options = {}) {
    return function (req, res, next) {
      const validationOptions = {
        abortEarly: true, // Changed to true to get only first error
        stripUnknown: false, // Changed to false to not strip unknown fields
        ...options,
      };
  

      ///////  for array
      // if (schema.body) {
      //   const schemaBody = Array.isArray(req.body)
      //     ? Joi.array().items(schema.body)
      //     : schema.body;
  
      //   const result = schemaBody.validate(req.body, validationOptions);
        
      //   if (result.error) {
      //     return res.status(400).json({
      //       error: true,
      //       message: result.error.details[0].message
      //     });
      //   }
  
      //   req.body = result.value;
      // }

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
        const result = Joi.object(schema.params).validate(req.params, validationOptions);
        
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



exports.joiValidate1 = function (schema, options = {}) {
  return function (req, res, next) {
    const validationOptions = {
      abortEarly: true,
      stripUnknown: false, // Changed to false to not strip unknown fields
      ...options,
    };

    if (schema.body) {
      const schemaBody = Array.isArray(req.body)
        ? Joi.array().items(schema.body)
        : schema.body;

      const result = schemaBody.validate(req.body, validationOptions);
      
      if (result.error) {
        return res.status(400).json({
          error: true,
          message: result.error.details[0].message
        });
      }

      req.body = result.value;
    }

    next();
  };
};


