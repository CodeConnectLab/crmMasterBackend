'use strict';

const path = require('path');
const nodemailer = require('nodemailer');
const template = new (require('email-templates'))({
    views: {
        options: {
            extension: 'ejs'
        },
        root: path.resolve(__dirname, 'templates')
    },
    htmlToText: false
});

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

exports.sendMail = function ({
    templateName,
    toEmail,
    locals,
    attachments,
    replyTo
}) {
    return new Promise(function (resolve, reject) {
        if (!toEmail) return reject("No receipients found")
        template.renderAll(templateName, locals)
            .then(function (result) {
                // setup email data with unicode symbols
                let mailOptions = {
                    from: process.env.SUPPORT_EMAIL, //'"Sender Name" <sender@gmail.com>"', // sender address
                    to: process.env.LOCAL_EMAIL || toEmail, // receiver address,
                    subject: result.subject, //'Hello ✔', // Subject line
                    text: result.text, //'Hello world ?', // plain text body
                    html: result.html, //'<b>Hello world ?</b>' // html body
                    secure: true,
                    priority: 'high'
                };
                if (replyTo)
                    mailOptions.replyTo = replyTo;

                if (attachments && attachments[0]) {
                    mailOptions.attachments = attachments
                }

                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject(error)
                        return console.error(error)
                    }
                    console.log('Message %s sent: %s', info.messageId, info.response);
                    return resolve(info);
                });
            })
            .catch(error => {
                reject(error);
                console.log(error);
            });
    })
}