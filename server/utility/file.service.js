'use strict';

const formidable = require('formidable'),
    path = require('path'),
    fs = require('fs'),
    uuidv1 = require('uuid'),
    AWS = require('aws-sdk'),
    multiparty = require('multiparty');

/* 
save file in `static` folder
 */
exports.parseAndSaveFileFormRequest = function ({
    req,
    cb,
    uploadDir,
    fileName
}) {
    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory
    uploadDir = uploadDir || path.join(__dirname, '../', 'uploads');
    form.uploadDir = uploadDir;

    // every time a file has been uploaded successfully,
    // rename it to it's unique name
    let filesArray = [];
    form.on('file', function (field, file) {
        // If file name does not exist we generate unique file name
        let uniqueName = fileName + path.extname(file.name) || uuidv1.v1() + path.extname(file.name);
        fs.rename(file.path, path.join(form.uploadDir, uniqueName));
        filesArray.push(uniqueName);
    });

    // log any errors that occur
    form.on('error', function (error) {
        cb(error, null);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        cb(null, filesArray);
    });
    // parse the incoming request containing the form data
    form.parse(req);
}

exports.saveReortPdf = function (req, directoryType) {
    let directoryName = directoryType ? directoryType : "icon";
    return new Promise(function (resolve, reject) {
        try {
            let updateObj = {
                // accessKeyId: process.env.AWS_ACCESS_KEY,
                // secretAccessKey: process.env.AWS_SECRET_KEY,
                region: 'us-east-2'
            };
            if (process.env.AWS_ACCESS_KEY) {
                updateObj.accessKeyId = process.env.AWS_ACCESS_KEY;
            }

            if (process.env.AWS_SECRET_KEY) {
                updateObj.secretAccessKey = process.env.AWS_SECRET_KEY;
            }
            AWS.config.update(updateObj);
            // Create S3 service object
            let s3 = new AWS.S3({
                apiVersion: '2006-03-01'
            });
            // call S3 to retrieve upload file to specified bucket
            let uploadParams = {
                Bucket: "yogarise-dev",
                Key: '',
                Body: '',
                ACL: 'public-read',
                ContentType: 'application/pdf',
                FileName: req.originalFilename // this is needed for Flash polyfill IE8-9
                //file: files
            };
            let file = fs.readFileSync(req.filePath);
            uploadParams.Body = file;
            // get the full path of the file
            uploadParams.Key = path.join(directoryName, req.originalFilename);
            // call S3 to retrieve upload file to specified bucket
            s3.upload(uploadParams, function (err, data) {
                if (err) {
                    //return reject(err);
                    console.log('file upload error', err);
                    return resolve('');
                }
                if (data) {
                    return resolve(data);
                }
            });
        } catch (error) {
            console.log("Error on icon upload: ", error);
            return resolve('');
        }
    })
}

/**
 * Upload multiparty data to s3 bucket
 * @param {*} req
 */
exports.uploadMultipartyFile = function (req, directoryType) {
    let directoryName = directoryType ? directoryType : "icon";

    return new Promise(function (resolve, reject) {
        var form = new multiparty.Form();
        try {
            form.parse(req, function (err, fields, files) {
                if (err) {
                    return reject(err);
                } else {
                    let updateObj = {
                        // accessKeyId: process.env.AWS_ACCESS_KEY,
                        // secretAccessKey: process.env.AWS_SECRET_KEY,
                        region: 'us-east-2'
                    };
                    if (process.env.AWS_ACCESS_KEY) {
                        updateObj.accessKeyId = process.env.AWS_ACCESS_KEY;
                    }

                    if (process.env.AWS_SECRET_KEY) {
                        updateObj.secretAccessKey = process.env.AWS_SECRET_KEY;
                    }
                    
                    AWS.config.update(updateObj);
                    // Create S3 service object
                    let s3 = new AWS.S3({
                        apiVersion: '2006-03-01'
                    });

                    // call S3 to retrieve upload file to specified bucket
                    if (files.file) {
                        let uploadParams = {
                            Bucket: "yogarise-dev",
                            Key: '',
                            Body: '',
                            ACL: 'public-read',
                            ContentType: files.file[0].headers["content-type"] != '' ? files.file[0].headers["content-type"] : 'application/octet-stream',
                            FileName: files.file[0].originalFilename // this is needed for Flash polyfill IE8-9
                            //file: files
                        };
                        let file = fs.readFileSync(files.file[0].path);
                        uploadParams.Body = file;
                        // get the full path of the file
                        let fileName = path.basename(files.file[0].path);
                        uploadParams.Key = path.join(directoryName, fileName);

                        // call S3 to retrieve upload file to specified bucket
                        s3.upload(uploadParams, function (err, data) {
                            if (err) {
                                return reject(err);
                            }
                            if (data) {
                                return resolve(data);
                            }
                        });
                    } else
                        reject("File not found");
                }
            });
        } catch (error) {
            console.log("Error on icon upload: ", error);
        }
    })
}

/**
 * Send email(Inprogress)
 * @param {*} 
 */
exports.sendEmail = function (email) {
    // Load the AWS SDK for Node.js
    // var AWS = require('aws-sdk');
    // Set the region 
    /* AWS.config.update({
        accessKeyId: << YOUR_ACCESS_KEY >>,
        secretAccessKey: << YOUR_ACCESS_KEY >>,
        region: << YOUR_ACCESS_KEY >>
  }); */

    // Create sendEmail params 
    var params = {
        Destination: {
            /* required */
            CcAddresses: [

                /* more items */
            ],
            ToAddresses: 'arun.kataria@oodlestechnologies.com'
        },
        Message: {
            /* required */
            Body: {
                /* required */
                Html: {
                    Charset: "UTF-8",
                    Data: "HTML_FORMAT_BODY"
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "TEXT_FORMAT_BODY"
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Test email'
            }
        },
        Source: 'SENDER_EMAIL_ADDRESS',
        /* required */
        ReplyToAddresses: [
            'EMAIL_ADDRESS',
            /* more items */
        ],
    };

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({
        apiVersion: '2010-12-01'
    }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(
        function (data) {
            console.log("send msg---", data);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}


//example to upload file
/*
const fileService = require('./file.service');
fileService.parseAndSaveFileFormRequest({
      req: req, cb: function (error,filesArray) {
        if(error){
          return responseHandler.error(res, error, error.message, 500)
        }
        responseHandler.success(res, filesArray, "Photos updated successfully", 200)
      }
});
*/

exports.imageUploadS3 = function ({
    image,
    directoryType,
    fileName
}) {
    return new Promise(function (resolve, reject) {

        let directoryName = directoryType ? directoryType : 'qrcode'
        AWS.config.update({
            region: 'us-east-2'
        });

        // Create S3 service object
        let s3Bucket = new AWS.S3({
            apiVersion: '2006-03-01'
        }),
            buf = new Buffer(image.replace(/^data:image\/\w+;base64,/, ""), 'base64'),
            data = {
                Bucket: "yogarise-dev",
                Key: path.join(directoryName, fileName),
                Body: buf,
                ACL: 'public-read',
                ContentEncoding: 'base64',
                ContentType: 'image/jpeg'
            };
        //s3Bucket.putObject(data, function (err, data) {
        s3Bucket.upload(data, function (err, data) {
            if (err) {
                console.log('Error uploading data: ', data);
                return reject(err);
            } else {
                console.log('succesfully uploaded the QR code image!');
                return resolve(data);
            }
        });
    })
}