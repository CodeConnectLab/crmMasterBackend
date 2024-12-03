'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./lostReason.controller'),
    auth = require('../auth/auth.service'),
    validationInputs = require('./lostReason.validation'),
    router = express.Router(),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };

router.post(usersVersion + "/lost-reason",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateLostReason, options),
    controller.createLostReason);


router.get(usersVersion + "/lost-reason",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getAllByCompany);

router.put(usersVersion + "/lost-reason/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateLostReason, options),
    controller.updateLeadSources);


router.delete(usersVersion + "/lost-reason/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
   // joiValidate(validationInputs.validateUpdateProductService, options),
    controller.toggleLeadSources);

module.exports = router;



