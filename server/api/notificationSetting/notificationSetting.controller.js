
const service = require("./notificationSetting.service")


exports.getNotificationList=(req,res,next)=>{
    return service.getNotificationList(req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.updateNotification=(req,res,next)=>{
    return service.updateNotificationSettings(req.params, req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.manuallySendNotification=(req,res,next)=>{
    return service.manuallySendNotification( req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.getNotificationListOfUser=(req,res,next)=>{
    return service.getNotificationListOfUser(req.body,req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
}


exports.saveNotificationListOfUser=(req,res,next)=>{
    return service.saveNotificationListOfUser( req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.getNotification=(req,res,next)=>{
    return service.getNotification( req.body, req.user)
    .then(result => responseHandler.success(res, result, "Get List successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.seenUpdate=(req,res,next)=>{
    return service.seenUpdate( req.body, req.user)
    .then(result => responseHandler.success(res, result, "Notifications marked as Seen!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};