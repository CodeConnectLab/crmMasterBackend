'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./lead.controller'),
    auth = require('../auth/auth.service'),
    validationInputs = require('./lead.validation'),
    router = express.Router(),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };


////create Lead
router.post(usersVersion + "/lead",
    auth.isAuthenticated({
        ///adminOnly: true
    }),
    joiValidate(validationInputs.validateLead, options),
    controller.createLead);


// ////get all lead 
router.get(usersVersion + "/lead",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getAllByCompany);

////get all followup
router.get(usersVersion + "/lead/follow-up",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getAllFollowupLeadsByCompany);






module.exports = router;



