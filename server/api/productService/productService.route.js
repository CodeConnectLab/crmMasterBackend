'use strict';

const express = require('express'),
  { joiValidate } = require("../../helpers/apiValidation.helper"),
  controller = require('./productService.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./productService.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };

router.post(usersVersion + "/product-service",
    auth.isAuthenticated({
        adminOnly: true
    }),
    joiValidate(validationInputs.validateProductService, options),
    controller.createProductService);


    router.get(usersVersion + "/product-service",
        auth.isAuthenticated({
           // adminOnly: true
        }),
        controller.getAllByCompany);

        router.put(usersVersion + "/product-service/:id",
            auth.isAuthenticated({
                adminOnly: true
            }),
            joiValidate(validationInputs.validateUpdateProductService, options),
            controller.updateProductService);


            router.delete(usersVersion + "/product-service/:id",
                auth.isAuthenticated({
                    adminOnly: true
                }),
               /// joiValidate(validationInputs.validateUpdateProductService, options),
                controller.toggleProductService);

module.exports = router;



