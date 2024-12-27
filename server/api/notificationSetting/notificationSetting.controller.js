
const service = require("./notificationSetting.service")


exports.getNotificationList=(req,res,next)=>{
    return service.getNotificationList(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};