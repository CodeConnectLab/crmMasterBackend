const Joi = require('joi')

exports.geoLocationUpload = {
  body: Joi.object({
    fileName: Joi.string().allow('', null).optional(),
    leadId: Joi.string().required(),
    coordinates: Joi.string().allow('', null).optional(),
    file: Joi.object({
      // fieldname: Joi.string().required(),
      // originalname: Joi.string().required(),
      // mimetype: Joi.string()
      //   .valid('image/jpeg', 'image/png', 'image/jpg')
      //   .required(),
      // buffer: Joi.binary().required()
    }).required()
  })
}
