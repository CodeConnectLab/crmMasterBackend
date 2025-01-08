
const service = require("./lead.service")

exports.createLead=(req,res,next)=>{
    return service.createLeadByCompany(res,req.body, req.user)
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
      sortBy: 'updatedAt',
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


//////////  uplode bulk excel sheet
exports.bulkUplodeLead1 = (req, res) => {
  if (!req.file) {
    return responseHandler.error(res, null, 'No file uploaded', 400);
  }

  const fileData = {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype
  };

  // Get form data for dropdowns
  const formData = {
    leadSource: req.body.leadSource,
    service: req.body.service,
    status: req.body.status,
    country: req.body.country,
    state: req.body.state,
    assignToAgent: req.body.assignToAgent
  };

  return service.bulkLeadUpload(fileData, req.user, formData)
    .then((result) => responseHandler.success(res, result, "Sheet upload successfully!", 200))
    .catch((error) => responseHandler.error(res, error, error.message, 500));
};

exports.bulkUplodeLead = async (req, res) => {
  try {
    if (!req.file) {
      return responseHandler.error(res, null, 'No file uploaded', 400);
    }


    // Get form data with null defaults
    const formData = {
      leadSource: req.body.leadSource || null,
      service: req.body.service || null,
      status: req.body.status || null,
      country: req.body.country || null,
      state: req.body.state || null,
      assignToAgent: req.body.assignToAgent || null
    };

    const fileData = {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype
    };

    const result = await service.bulkLeadUpload(fileData, req.user, formData);
    return responseHandler.success(res, result, "Sheet upload successfully!", 200);

  } catch (error) {
    console.error('Error in bulkUplodeLead controller:', error);
    return responseHandler.error(res, error, error.message || 'Error processing upload', 500);
  }
};




exports.exportExcel = async (req, res) => {
  try {
      const result = await service.exportExcel(req.body, req.user);
      // Send the file data in the response
      return responseHandler.success(res, result, "Excel file generated successfully!", 200);
  } catch (error) {
      console.error('Export Excel Error:', error);
      return responseHandler.error(res, error, error.message, 500);
  }
};

exports.exportPdf=async (req,res)=>{
  try {
    const result = await service.exportPDF(req.body, req.user);
    return responseHandler.success(res, result, "PDF file generated successfully!", 200);
} catch (error) {
    console.error('Export PDF Error:', error);
    return responseHandler.error(res, error, error.message, 500);
}
}




  exports.get=(req,res)=>{
   return responseHandler.success(res, '', "ok", 200)
  }

