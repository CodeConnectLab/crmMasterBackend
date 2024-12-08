'use strict';

const express = require('express'),
    router = express.Router(),
    auth = require('../auth/auth.service'),
    controller = require('./locations.controller'),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };

router.get(usersVersion + "/locations/countries",
    auth.isAuthenticated({
    }),
    controller.getAllCountry);

router.get(usersVersion + "/locations/states/:id",
    auth.isAuthenticated({
    }), 
    controller.getAllState);

router.get(usersVersion + "/lead-types",
    auth.isAuthenticated({
    }),
    controller.getAllTypes);

module.exports = router;



