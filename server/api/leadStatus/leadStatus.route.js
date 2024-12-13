'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./leadStatus.controller'),
    auth = require('../auth/auth.service'),
    validationInputs = require('./leadStatus.validation'),
    router = express.Router(),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };

router.post(usersVersion + "/lead-status",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateLeadStatus, options),
    controller.createLeadStatus);


router.get(usersVersion + "/lead-status",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getAllByCompany);

router.put(usersVersion + "/lead-status/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateUpdateLeadStatus, options),
    controller.updateLeadStatus);


router.delete(usersVersion + "/lead-status/:id",
    auth.isAuthenticated({
        adminOnly: true
    }),
   // joiValidate(validationInputs.validateUpdateProductService, options),
    controller.toggleLeadStatus);

module.exports = router;



