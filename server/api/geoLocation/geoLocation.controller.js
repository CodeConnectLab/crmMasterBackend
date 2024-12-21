
// const service=require('./geoLocation.service')
// exports.geoLocationUplode = (req, res) => {
//     return service.geoLocationUplode(req.body, req.user)
//         .then((result) => responseHandler.success(res, result, "File Uplode successfully!", 200))
//         .catch((error) => responseHandler.error(res, error, error.message, 500));
// };


// const service = require('./geoLocation.service');
// const { joiValidate } = require('../../helpers/apiValidation.helper');
// const validationInputs = require('./geoLocation.validation.js');

// exports.geoLocationUplode = async (req, res) => {
 // try {
    // Validate request body
   //  await joiValidate(validationInputs.geoLocationUpload, req.body);
    
      //  return service.geoLocationUplode(req.body, req.user)
      //   .then((result) => responseHandler.success(res, result, "File Uplode successfully!", 200))
      //   .catch((error) => responseHandler.error(res, error, error.message, 500));
//   } catch (error) {
//     return responseHandler.error(res, error, error.message, 500);
//   }
// };