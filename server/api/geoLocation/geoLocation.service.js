const fs = require('fs').promises;
const GeoLocationModel = require('./geoLocation.model');
const { uploadToS3 } = require('../../helpers/aws-s3.helper');



exports.uploadGeoLocation =async(data, user)=>{
  try {
    // Read the file from the local path
    const fileBuffer = await fs.readFile(data.filePath);
    
    // Prepare file object for S3 upload
    const fileObj = {
      originalname: data.originalName,
      buffer: fileBuffer,
      mimetype: 'image/png' 
    };

    // Upload to S3
    const s3Upload = await uploadToS3(fileObj);

    // Create location data
    const locationData = {
      fileName: data.fileName,
      originalName: data.originalName,
      s3Key: s3Upload.key,
      s3Url: s3Upload.url,
      coordinates: data.coordinates || '',
      companyId: user.companyId,
      leadId: data.leadId
    };

    // Create record in database
    const location = await GeoLocationModel.create(locationData);

    // Optionally cleanup the local file
    try {
      await fs.unlink(data.filePath);
    } catch (cleanupError) {
      console.error('Error cleaning up local file:', cleanupError);
      // Don't throw error for cleanup failures
    }

    return location;
  } catch (error) {
    console.error('Error in geoLocationService.uploadGeoLocation:', error);
    return Promise.reject(error);
  }
}