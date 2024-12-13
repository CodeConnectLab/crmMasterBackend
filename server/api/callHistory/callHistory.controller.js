
const { error } = require("../../config/responseHandler");
const service = require("./callHistory.service")

exports.saveCallHistory = (req, res, next) => {
    return service.saveCallHistory(req.body, req.user)
        .then(result => responseHandler.success(res, result, "Call history saved successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.callReport=(req,res,next)=>{
    return service.callReport(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Call report get successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.productSaleReport=(req, res, next)=>{
    return service.productSaleReport(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get Report Successfully!", 200))
    .catch(error=>  responseHandler.error(res, error, error.message, 500));
}

exports.getCallList = (req, res, next) => {
    const { page, limit, search } = req.query;
    return service.getCallList(req.body, { page, limit, search }, req.user)
      .then(result => responseHandler.success(res, result, "Call list retrieved successfully", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
  };