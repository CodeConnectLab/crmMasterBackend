const S3 = require('aws-sdk/clients/s3');
const AWS = require('aws-sdk');
const MY_BUCKET_NAME = "content.yogarise.com";
const fs = require('fs');
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function getPresignedUrl(fileName, ContentType) {
    try {
        const fileContent = fs.readFileSync(fileName.path);
        const s3Params = {
            Bucket: MY_BUCKET_NAME,
            Key: `${Date.now()}_${fileName.originalname}`, // Ensure a unique key
            Expires: 60 * 60,
            Body: fileContent,
            ContentType: ContentType
        };
        const s3 = new AWS.S3();
        const data = await s3.upload(s3Params).promise(); 
        const imageUrl = data.Location;
        if (!imageUrl) throw "Error!";
        return imageUrl ;
    } catch (error) {
        console.error('Error:', error); // Log the error
        return Promise.reject(error);
    }
}



module.exports = {
    getPresignedUrl
}