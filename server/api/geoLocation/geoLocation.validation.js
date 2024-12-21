const geoLocationSchema = Joi.object({
    fileName: Joi.string().required(),
    leadId: Joi.string().required(),
    coordinates: Joi.string().required()
  });

  module.exports = {
    geoLocationUpload: geoLocationSchema
  };