

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