'use strict';

const errorHandler = require('errorhandler');
module.exports = function (app, config) {
    let env = app.get('env');
    let mailer = require('../mailer');
    //In case of production environment 
    if ('production' === env) {
        //If any unhandled rejection occur we are sending error to the given email id
        process.on('unhandledRejection', (reason, p) => {
            let locals = {
                error: {
                    reason: reason,
                    p: p
                }
            }
            mailer.sendMail('error', config.exceptionEmailID, locals);
        });
        //If any uncaught exception occur we are sending execption to the given email id
        process.on('uncaughtException', (err) => {
            let locals = {
                error: err
            }
            mailer.sendMail('error', config.exceptionEmailID, locals);
        });
    }
    //In case of development or test environment 
    if ('development' === env || 'test' === env) {
        // app.use(errorHandler({ log: errorNotification })) // Error handler - has to be last
        process.on('unhandledRejection', (reason, p) => {
            let locals = {
                error: {
                    reason: reason,
                    p: p
                }
            }
            console.log(locals)

            // mailer.sendMail('error', config.exceptionEmailID, locals);
        });
        //If any uncaught exception occur we are sending execption to the given email id
        process.on('uncaughtException', (err) => {
            let locals = {
                error: err
            }
            console.log("custome", locals)
            // mailer.sendMail('error', config.exceptionEmailID, locals);
        });
    }
};

//If any error occure on development or test enviorment we are showing a notification
function errorNotification(err, str, req) {
    console.log("-----------------------------------------------------------")
    const notifier = require('node-notifier');
    console.log(`Error occured : ${str}`);
    var title = 'Error in ' + req.method + ' ' + req.url
    notifier.notify({
        title: title,
        message: str
    })
}