'use strict';

const errorHandler = require('errorhandler');
module.exports = function (app, config) {
    let env = app.get('env');
    let mailer = require('../mailer');
    if ('production' === env) {
        process.on('unhandledRejection', (reason, p) => {
            let locals = {
                error: {
                    reason: reason,
                    p: p
                }
            }
           
        });
        //If any uncaught exception occur we are sending execption to the given email id
        process.on('uncaughtException', (err) => {
            let locals = {
                error: err
            }
           
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

           
        });
        //If any uncaught exception occur we are sending execption to the given email id
        process.on('uncaughtException', (err) => {
            let locals = {
                error: err
            }
            console.log("custome", locals)
           
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