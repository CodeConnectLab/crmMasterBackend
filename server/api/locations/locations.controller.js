
const service = require("./locations.service")


exports.getAllCountry=(req,res,next)=>{
    return service.getAllCountry(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Country Get successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.getAllState=(req,res,next)=>{
    return service.getAllState(req.params.id, req.user)
    .then(result => responseHandler.success(res, result, "State Get successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.getAllTypes1=(req,res,next)=>{
    return service.getAllTypes(req.params.id, req.user)
    .then(result => responseHandler.success(res, result, "Get data successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.getAllTypes = (req, res) => {
    return service.getAllTypes(req.body,req.user)
      .then(result => res.status(200).json({
        success: true,
        message: 'Lead types fetched successfully',
        data: result
      }))
      .catch(error => res.status(500).json({
        error: true,
        message: error.message || 'Something went wrong',
        data: {}
      }));
  };

