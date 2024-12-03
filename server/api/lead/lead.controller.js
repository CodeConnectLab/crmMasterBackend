
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
      search: req.query.search
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
      search: req.query.search
    };
  
    return service.getAllFollowupLeadsByCompany(queryParams, req.user)
      .then(result =>responseHandler.success1(res, result, "Leads retrieved successfully!", 200))
      .catch(error => responseHandler.error(res, error, error.message, 500));
  };

