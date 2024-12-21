// const GeoLocationModel = require('./geoLocation.model');

// exports.geoLocationUplode = async (data, user) => {
//   try {
//     const locationData = {
//       fileName: data.fileName,
//       originalName: data.originalName || data.fileName,
//       filePath: data.filePath || '',
//       codinates: data.coordinates,
//       companyId: user.companyId,
//       leadId: data.leadId
//     };

//     const location = await GeoLocationModel.create(locationData);
//     return location;
//   } catch (error) {
//     console.error('Error in geoLocationUplode:', error);
//     throw error;
//   }
// };