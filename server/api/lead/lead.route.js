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


///////////  lead update 
router.put(usersVersion + "/lead/:id",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    joiValidate(validationInputs.validateUpdateLead, options),
    controller.getLeadUpdate);

    //////////  get lead details
    router.get(usersVersion + "/lead/:id",
        auth.isAuthenticated({
            // adminOnly: true
        }),
       // joiValidate(validationInputs.validateUpdateLead, options),
        controller.getLeadDetails);

/////// genral api route 
router.get("/",
    // auth.isAuthenticated({
    //     // adminOnly: true
    // }),
    controller.get);






module.exports = router;



