'use strict'

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./lead.controller'),
  auth = require('../auth/auth.service'),
  validationInputs = require('./lead.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }

  // const upload = require('../middlewares/upload.middleware');

const upload = require('../../config/multer.config')
//////////////uplode bulk lead through excel
router.post(
  usersVersion + '/bulkUplodeLead',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  // joiValidate(validationInputs.bulkUplodeLead),
  upload.single('file'),
  controller.bulkUplodeLead
)

////create Lead
router.post(
  usersVersion + '/lead',
  auth.isAuthenticated({
    ///adminOnly: true
  }),
  joiValidate(validationInputs.validateLead, options),
  controller.createLead
)

// ////get all lead
router.get(
  usersVersion + '/lead',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.getAllByCompany
)

////get all followup
router.get(
  usersVersion + '/lead/follow-up',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  // joiValidate(validationInputs.getAllFollowupLeadsFilter, options),
  controller.getAllFollowupLeadsByCompany
)


////get all imported lead
router.get(
  usersVersion + '/lead/imported',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.getAllImportedLeadsByCompany
)

////get all outsourced lead
router.get(
  usersVersion + '/lead/outsourced',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  controller.getAllOutsourcedLeadsByCompany
)

///////////  lead update
router.put(
  usersVersion + '/lead/:id',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  joiValidate(validationInputs.validateUpdateLead, options),
  controller.getLeadUpdate
)

//////////  get lead details
router.get(
  usersVersion + '/lead/:id',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  // joiValidate(validationInputs.validateUpdateLead, options),
  controller.getLeadDetails
)

//////////  bulk action lead update
router.put(
  usersVersion + '/bulkUpdate',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  joiValidate(validationInputs.bulkUpdateLeads, options),
  controller.bulkUpdateLeads
)
//////////  bulk Delete lead 
router.delete(
  usersVersion + '/bulkDelete',
  auth.isAuthenticated({
    // adminOnly: true
  }),
  joiValidate(validationInputs.bulkDeleteLeads),
  controller.bulkDeleteLeads
);












/////// genral api route
router.get(
  '/',
  // auth.isAuthenticated({
  //     // adminOnly: true
  // }),
  controller.get
)

module.exports = router
