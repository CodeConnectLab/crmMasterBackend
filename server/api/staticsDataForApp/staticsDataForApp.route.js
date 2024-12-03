const express = require('express'),
    router = express.Router(),
    controller = require('./staticsDataForApp.controller'),
    StaticsVersion1 = '/v1/getdata';
    auth = require('../auth/auth.service'),



    router.get(StaticsVersion1,auth.isAuthenticated({
        skipAuth: true
    }),
        controller.getstaticsDataForApp);
module.exports = router;