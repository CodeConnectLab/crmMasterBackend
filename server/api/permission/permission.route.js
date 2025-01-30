'use strict'
const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./permission.controller'),
  auth = require('../auth/auth.service'),
  validationInputs = require('./permission.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }

router.get(
  usersVersion + '/features',
  auth.isAuthenticated({
    //   adminOnly: true
  }),
  controller.getAllFeatureList
)
////Create/update role permissions for a company
router.post(
  usersVersion + '/createPermissions',
  auth.isAuthenticated({
    //adminOnly: true
  }),
  joiValidate(validationInputs.createPermissions, options),
  controller.createPermissions
)

module.exports = router
