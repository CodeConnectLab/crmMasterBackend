
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