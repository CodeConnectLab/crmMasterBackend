const service = require("./staticsDataForApp.service")

exports.getstaticsDataForApp = (req, res, next) => {
    return service.getstaticsDataForApp(req.body, req.user)
        .then(result => res.json({status: 200,message: "get data successful!",...result}))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}