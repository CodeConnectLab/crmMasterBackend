
const service = require("./productService.service")

exports.createProductService=(req,res,next)=>{
    return service.createProductService(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.getAllByCompany=(req,res,next)=>{
    return service.getAllByCompany(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.updateProductService=(req,res,next)=>{
    return service.updateProductService(req.params.id, req.body, req.user)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};



exports.toggleProductService = (req, res) => {
  return service.toggleProductService(req.params.id, req.user)
    .then(result => res.status(200).json({
      success: true,
      message: `Product/Service ${result.isActive ? 'activated' : 'deactivated'} successfully`,
      data: result
    }))
    .catch(error => res.status(400).json({
      error: true,
      message: error.message
    }));
};