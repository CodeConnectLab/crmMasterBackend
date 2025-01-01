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


   /////  menualy send push notification
   router.post(usersVersion + "/manuallySendNotification",
    auth.isAuthenticated({
        // adminOnly: true
    }),
    controller.manuallySendNotification);   

    //////////// get notification list of user 
    router.get(usersVersion + "/getNotificationListOfUser",
        auth.isAuthenticated({
            // adminOnly: true
        }),
        controller.getNotificationListOfUser); 

        /////////////save notification
        router.post(usersVersion + "/saveNotificationListOfUser",
            auth.isAuthenticated({
                // adminOnly: true
            }),
            controller.saveNotificationListOfUser);

            ///////// get notification for  movile and web
            router.get(usersVersion + "/getNotification",
                auth.isAuthenticated({
                    // adminOnly: true
                }),
                controller.getNotification);
//////////////// update seen notificatio

                router.put(usersVersion + "/seenUpdate",
                    auth.isAuthenticated({
                        // adminOnly: true
                    }),
                    controller.seenUpdate);



    module.exports = router;