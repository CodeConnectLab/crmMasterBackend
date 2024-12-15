
const service = require("./lead.service")

exports.createLead=(req,res,next)=>{
    return service.createLeadByCompany(req.body, req.user)
    .then((result) => {
        if (result.message === 'Lead with this contact number already exists') {
           responseHandler.error(res, '', 'Lead with this contact number already exists', 200)
        } else {
          responseHandler.success(res, result, 'Lead created successful!', 200)
        }
      })
      .catch((error) => responseHandler.error(res, error, error.message, 500))
  }

/////  get All Lead Of Company BY Role Base
exports.getAllByCompany = (req, res) => {
    const queryParams = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      leadStatus: req.query.leadStatus,
      assignedAgent: req.query.assignedAgent,
      leadSource: req.query.leadSource,
      productService: req.query.productService,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: 'followUpDate',
      sortOrder: 'asc'
    };
  
    return service.getAllLeadsByCompany(queryParams, req.user)
      .then(result =>responseHandler.success1(res, result, "Leads retrieved successfully!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
  };

/////  get All follow up Lead Of Company BY Role Base
exports.getAllFollowupLeadsByCompany = (req, res) => {
    const queryParams = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      leadStatus: req.query.leadStatus,
      assignedAgent: req.query.assignedAgent,
      leadSource: req.query.leadSource,
      productService: req.query.productService,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: 'followUpDate',
      sortOrder: 'asc'
    };
  
    return service.getAllFollowupLeadsByCompany(queryParams, req.user)
      .then(result =>responseHandler.success1(res, result, "Leads retrieved successfully!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
  };


///////////  get all importd lead
exports.getAllImportedLeadsByCompany = (req, res) => {
  const queryParams = {
    page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      leadStatus: req.query.leadStatus,
      assignedAgent: req.query.assignedAgent,
      leadSource: req.query.leadSource,
      productService: req.query.productService,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: 'followUpDate',
      sortOrder: 'asc'
  };
  return service.getAllImportedLeadsByCompany(queryParams, req.user)
    .then(result =>responseHandler.success1(res, result, "Leads retrieved successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
}

///////////  get all out sourced lead
exports.getAllOutsourcedLeadsByCompany = (req, res) => {
  const queryParams = {
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    leadStatus: req.query.leadStatus,
    assignedAgent: req.query.assignedAgent,
    leadSource: req.query.leadSource,
    productService: req.query.productService,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    sortBy: 'followUpDate',
    sortOrder: 'asc'
  };
  return service.getAllOutsourcedLeadsByCompany(queryParams, req.user)
    .then(result =>responseHandler.success1(res, result, "Leads retrieved successfully!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
}

  /////////  update lead
  exports.getLeadUpdate = (req, res) => {
      return service.getLeadUpdate(req.params.id,req.body,req.user)
       .then((result)=>responseHandler.success(res, result,"Lead update successfully!", 200))
       .catch((error) => responseHandler.error(res, error, error.message, 500));
  }

  /////////  bulk update lead 
exports.bulkUpdateLeads = (req, res) => {
  return service.bulkUpdateLeads(req.body, req.user)
      .then((result) => responseHandler.success(res, result, "Lead update successfully!", 200))
      .catch((error) => responseHandler.error(res, error, error.message, 500));
};

exports.bulkDeleteLeads = (req, res) => {
  return service.bulkDeleteLeads(req.body, req.user)
      .then((result) => responseHandler.success(res, result, "Leads deleted successfully!", 200))
      .catch((error) => responseHandler.error(res, error, error.message, 500));
};

  ///////  get lead details
  exports.getLeadDetails = (req, res) => {
    return service.getLeadDetails(req.params.id,req.body,req.user)
     .then((result)=>responseHandler.success(res, result,"Lead update successfully!", 200))
     .catch((error) => responseHandler.error(res, error, error.message, 500));
}


  exports.get=(req,res)=>{
   return responseHandler.success(res, '', "ok", 200)
  }

