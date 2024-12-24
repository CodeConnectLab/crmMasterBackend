// const S3 = require('aws-sdk/clients/s3');
// const AWS = require('aws-sdk');
// const MY_BUCKET_NAME = process.env.MY_BUCKET_NAME;
// const fs = require('fs');
// AWS.config.update({
//     region: process.env.AWS_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// async function getPresignedUrl(fileName, ContentType) {
//     try {
//         const fileContent = fs.readFileSync(fileName.path);
//         const s3Params = {
//             Bucket: MY_BUCKET_NAME,
//             Key: `${Date.now()}_${fileName.originalname}`, // Ensure a unique key
//             Expires: 60 * 60,
//             Body: fileContent,
//             ContentType: ContentType
//         };
//         const s3 = new AWS.S3();
//         const data = await s3.upload(s3Params).promise(); 
//         const imageUrl = data.Location;
//         if (!imageUrl) throw "Error!";
//         return imageUrl ;
//     } catch (error) {
//         console.error('Error:', error); // Log the error
//         return Promise.reject(error);
//     }
// }



// module.exports = {
//     getPresignedUrl
// }


const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const uploadToS3 = async (file, folder = 'geo-locations') => {
  try {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const params = {
      Bucket: process.env.MY_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read'
    };

    const uploadResult = await s3.upload(params).promise();
    return {
      url: uploadResult.Location,
      key: uploadResult.Key
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

module.exports = { uploadToS3 };