

const service = require("./thirdParty.service")

exports.getCurlApi=(req,res,next)=>{
    return service.getCurlApi(req.query.leadSource, req.user)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.OutsourceLead=(req,res,next)=>{
    return service.OutsourceLead(req.query.apikey,req.body)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

