const service = require('./geoLocation.service');
exports.geoLocationUplode = async (req, res) => {
  try {
    return service.uploadGeoLocation(req.body, req.user)
        .then((result) => responseHandler.success(res, result, "File Uplode successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
  } catch (error) {
    return responseHandler.error(res, error, error.message, 500);
  }
};