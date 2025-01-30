// permission.validation.js
const Joi = require('joi');
const { featurePermissions } = require('../../config/constants/featureConfig');

exports.createPermissions = {
    body: Joi.object({
        features: Joi.array().items(
            Joi.object({
                name: Joi.string()
                    .valid(...Object.keys(featurePermissions))
                    .required(),
                permissions: Joi.object({
                    add: Joi.boolean().default(false),
                    edit: Joi.boolean().default(false),
                    delete: Joi.boolean().default(false),
                    view: Joi.boolean().default(false)
                }).required()
            })
        ).required()
    })
};

exports.checkPermission = {
    query: Joi.object({
        feature: Joi.string()
            .valid(...Object.keys(featurePermissions))
            .required(),
        action: Joi.string()
            .valid('add', 'edit', 'delete', 'view')
            .required()
    })
};