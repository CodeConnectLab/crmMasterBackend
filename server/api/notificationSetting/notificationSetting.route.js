'use strict';

const express = require('express'),
    { joiValidate } = require("../../helpers/apiValidation.helper"),
    controller = require('./notificationSetting.controller'),
    auth = require('../auth/auth.service'),
    validationInputs = require('./notificationSetting.validation'),
    router = express.Router(),
    usersVersion = '/v1',
    options = {
        wantResponse: true,
    };

router.get(usersVersion + "/getNotificationList",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.getNotificationList);


    router.put(usersVersion + "/updateNotification/:id",
        auth.isAuthenticated({
            // adminOnly: true
        }),
        controller.updateNotification);


   ///////  menualy send push notification
   router.post(usersVersion + "/manuallySendNotification",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.manuallySendNotification);   

    module.exports = router;