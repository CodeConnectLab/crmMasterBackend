
const service = require("./permission.service")

exports.getAllFeatureList=(req,res,next)=>{
    return service.getAllFeatureList(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Feature get successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.createPermissions=(req, res, next)=>{
    return service.createPermissions(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Create Permissions successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
}

