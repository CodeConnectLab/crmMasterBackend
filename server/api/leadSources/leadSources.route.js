'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./leadSources.controller'),
    auth = require('../auth/auth.service'),
    validationInputs = require('./leadSources.validation'),
    router = express.Router(),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };

router.post(usersVersion + "/lead-sources",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateLeadSources, options),
    controller.createLeadSources);


router.get(usersVersion + "/lead-sources",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getAllByCompany);

router.put(usersVersion + "/lead-sources/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateLeadSources, options),
    controller.updateLeadSources);


router.delete(usersVersion + "/lead-sources/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
   // joiValidate(validationInputs.validateUpdateProductService, options),
    controller.toggleLeadSources);

module.exports = router;



