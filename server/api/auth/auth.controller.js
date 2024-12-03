const service = require("./auth.service");
const jwtHelper = require("../../helpers/jwt.helper");
exports.logIn = (req, res, next) => {
   return service.logIn(req.body, req.user)
        .then(result => responseHandler.success(res, result, "User signed in successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.refresh = (req, res, next) => {
    return service.refresh(req.body, req.headers.refresh)
        .then(result => responseHandler.success(res, result, "User refresh successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.requestOTP = (req, res, next) => {
    return service.requestOTP(req.body, req.headers.refresh)
        .then(result => responseHandler.success(res, result, "User refresh successful!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}


exports.verifyOtp = (req, res, next) => {
    return service.verifyOtp(req.body, req.headers.refresh)
        .then(result => responseHandler.success(res, result, "OTP verified successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.resetPassword = (req, res, next) => {
    return service.resetPassword(req.body, req.headers.refresh)
        .then(result => responseHandler.success(res, result, "Password reset successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.handleLogout = async (req, res) => {
    let token = req.headers.authorization
    try {
        if (token) {
            const result = await jwtHelper.logout(token);
            return responseHandler.success(res, '', result, 200);
        } else {
            return responseHandler.error(res, '', "Token is required for logout", 401);
        }
    } catch (error) {
        return responseHandler.error(res, '', error.message, 500);
    }
};