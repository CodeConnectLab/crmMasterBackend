const LeadBloomFilterManager = require('../../utility/BloomFilter/LeadBloomFilterManager');
const Lead = require('./lead.model');
const LeadSource = require('../leadSources/leadSources.model');
const ProductService = require('../productService/productService.model')
const User = require('../user/user.model')
const LeadStatus = require('../leadStatus/leadStatus.model');
const {validateLeadHistory} = require('./lead.validation');
const {leadHistoryController} =require('./leadHistory.service');
const LeadHistory=require('./leadHistory.model');
const { Types } = require('mongoose');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const GeoLocationModel = require('../geoLocation/geoLocation.model');
const userRoles = require('../../config/constants/userRoles')
////////  lead Save 
exports.createLeadByCompany = async (res,data, user) => {
    try {
        if (data.contactNumber) {
            const bloomFilterManager = LeadBloomFilterManager.getInstance();
            const mightExist = await bloomFilterManager.mightHaveDuplicate(
                user.companyId,
                data.contactNumber,
            );
            if (mightExist) {
                const existingLead = await Lead.findOne({
                    companyId: user.companyId,
                    contactNumber: data.contactNumber,
                });
                if (existingLead) {
                  return res.status(500).json({ message: 'Lead with this contact number already exists' });
                    // return {
                    //     message: "Lead with this contact number already exists",
                    // };

                }
            }
            bloomFilterManager.addContactNumber(user.companyId, data.contactNumber);
        }
        const lead = await Lead.create({
            ...data,
            leadUpdated:true,
            companyId: user.companyId,
            createdBy: user._id,
        });
        return lead;
    } catch (error) {
        return Promise.reject(error);
    }
};

//////////  Bulk Lead Uplode 
exports.bulkLeadUpload = async (fileData, user, formData) => {
    try {
      console.log('Starting bulk lead upload process');
  
      const workbook = XLSX.read(fileData.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const leads = XLSX.utils.sheet_to_json(worksheet);
  
      console.log(`Parsed ${leads.length} leads from Excel`);
  
      const validLeads = [];
      const duplicates = [];
      const existingPhoneNumbers = new Set();
  
      // Get existing contacts to check duplicates
      if (leads.some(lead => lead.contactNumber)) {
        console.log('Checking for existing contact numbers');
        const existingLeads = await Lead.find({
          companyId: user.companyId,
          contactNumber: { 
            $in: leads.map(lead => lead.contactNumber).filter(Boolean) 
          }
        }, { contactNumber: 1 });
  
        console.log(`Found ${existingLeads.length} existing contacts`);
  
        existingLeads.forEach(lead => {
          if (lead.contactNumber) {
            existingPhoneNumbers.add(lead.contactNumber.toString());
          }
        });
      }
  
      // Process each lead
      for (let [index, lead] of leads.entries()) {
        const rowNumber = index + 2;
  
        if (lead.contactNumber) {
          const phoneNumber = lead.contactNumber.toString().trim();
          if (existingPhoneNumbers.has(phoneNumber)) {
            duplicates.push(`Row ${rowNumber}: Skipped duplicate contact number ${phoneNumber}`);
            continue;
          }
          existingPhoneNumbers.add(phoneNumber);
        }
  
        // Create lead object
        const leadObj = {
          companyId: user.companyId,  // Remove optional chaining
          createdBy: user._id,        // Remove optional chaining
          firstName: lead.fullName || '',
          lastName: lead.lastName || '',
          email: lead.email || '',
          contactNumber: lead.contactNumber || '',
          leadSource: formData.leadSource,      // Remove optional chaining
          productService: formData.service,     // Remove optional chaining
          assignedAgent: formData.assignToAgent,// Remove optional chaining
          leadStatus: formData.status,         // Remove optional chaining
          followUpDate: new Date(),
          description: lead.description || '',
          fullAddress: lead.fullAddress || '',
          website: lead.website || '',
          companyName: lead.companyName || '',
          country: formData.country || '',
          state: formData.state || '',
          city: lead.city || '',
          pinCode: lead.pinCode || '',
          alternatePhone: lead.alternatePhone || '',
          leadCost: lead.leadCost || 0,
          leadAddType: 'Import',
          leadWonAmount: lead.leadWonAmount || 0,
          addCalender: false,
          calanderMassage: '',
          comment: lead.comment || ''
        };
  
        validLeads.push(leadObj);
      }
  
      console.log(`Processing ${validLeads.length} valid leads`);
  
      // Insert valid leads in batches
      if (validLeads.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < validLeads.length; i += batchSize) {
          const batch = validLeads.slice(i, i + batchSize);
          console.log(`Inserting batch ${i/batchSize + 1}`);
          try {
            const insertedLeads = await Lead.insertMany(batch, { ordered: false });
            console.log(`Successfully inserted ${insertedLeads.length} leads in batch`);
          } catch (insertError) {
            console.error('Error inserting batch:', insertError);
            throw insertError;
          }
        }
      }
  
      return {
        totalProcessed: leads.length,
        successful: validLeads.length,
        skipped: duplicates.length,
        duplicateDetails: duplicates
      };
  
    } catch (error) {
      console.error('Error in bulkLeadUpload service:', error);
      if (error.code === 11000) {
        throw {
          message: 'Error while processing leads',
          errors: ['Some leads could not be added to the database']
        };
      }
      throw error;
    }
  };
 


//////  get All lead
exports.getAllLeadsByCompany = async (params, user) => {
    try {
        if (!user?.companyId || !user?._id) {
            throw new Error('Invalid user data');
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            leadStatus,
            assignedAgent,
            leadSource,
            productService,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'asc'
        } = params;
        
        // Ensure page and limit are valid numbers
        const validPage = Math.max(1, parseInt(page));
        const validLimit = Math.max(1, parseInt(limit));

        const data = await getAllLeadByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            validPage,
            validLimit,
            // Number(page),
            // Number(limit),
            {
                search,
                leadStatus,
                assignedAgent,
                leadSource,
                productService,
                startDate,
                endDate,
                sortBy,
                sortOrder
            }
        );

        return {
            data: data.data,
            options: {
                pagination: {
                    total: data.total,
                    page: data.page,
                    totalPages: data.totalPages,
                    limit: data.limit
                }
            }
        };
    } catch (error) {
        return Promise.reject(error);
    }
};

const getAllLeadByCompanyWithPagination = async (
    role,
    companyId,
    userId,
    page,
    limit,
    filters
) => {
    try {
      // const skip = (page - 1) * limit
      // Ensure skip calculation is correct
      const skip = Math.max(0, (page - 1) * limit);

      // Base query with company and deleted condition
      let query = {
        companyId: companyId
        //  deleted: false
      }

      // Add assignedAgent filter only for User role
      if (role !== userRoles.SUPER_ADMIN) {
        if (role === userRoles.USER) {
          // For regular users - show only their own data
          query.assignedAgent = userId
        } else if (role === userRoles.TEAM_ADMIN) {
          // For Team Leaders - show their data AND data of users assigned to them
          query.$or = [
            { assignedAgent: userId }, // TL's own data
            {
              assignedAgent: {
                $in: await User.distinct('_id', { assignedTL: userId })
              }
            } // Data where agent is any user assigned to this TL
          ]
        }
      }

      // Add date range filter if provided
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate)
        start.setUTCHours(0, 0, 0, 0)
        const end = new Date(filters.endDate)
        end.setUTCHours(23, 59, 59, 999)

        query.followUpDate = {
          $gte: start,
          $lte: end
        }
      }

      // Add specific filters if provided
      if (filters?.leadStatus) {
        query.leadStatus = new Types.ObjectId(filters.leadStatus)
      }
      if (filters?.assignedAgent) {
        query.assignedAgent = new Types.ObjectId(filters.assignedAgent)
      }
      if (filters?.leadSource) {
        query.leadSource = new Types.ObjectId(filters.leadSource)
      }
      if (filters?.productService) {
        query.productService = new Types.ObjectId(filters.productService)
      }

      // Search functionality
      if (filters?.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { contactNumber: { $regex: filters.search, $options: 'i' } },
          { city: { $regex: filters.search, $options: 'i' } }
        ]
      }

      // Build sort object
      const sortObj = {}
      sortObj[filters?.sortBy] = filters?.sortOrder === 'desc' ? -1 : 1

      // Get total count for pagination
      const total = await Lead.countDocuments(query)

      // Get paginated leads
      const leads = await Lead.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortObj)
        .populate([
          {
            path: 'leadSource',
            select: '_id name',
            model: 'LeadSource'
          },
          {
            path: 'productService',
            select: '_id name',
            model: 'ProductService'
          },
          {
            path: 'assignedAgent',
            select: '_id name',
            model: 'User'
          },
          {
            path: 'leadStatus',
            select: '_id name color',
            model: 'LeadStatus'
          }
        ])
        .lean()

      return {
        data: leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
        console.error('Error in getAllLeadByCompanyWithPagination:', error);
        throw error;
    }
};


//////  get All Followup lead
exports.getAllFollowupLeadsByCompany = async (params, user) => {
    try {
        if (!user?.companyId || !user?._id) {
            throw new Error('Invalid user data');
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            leadStatus,
            assignedAgent,
            leadSource,
            productService,
            startDate,
            endDate,
            sortBy = 'followUpDate',
            sortOrder = 'asc'
        } = params;

        const data = await getAllFollowupLeadByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            Number(page),
            Number(limit),
            {
                search,
                leadStatus,
                assignedAgent,
                leadSource,
                productService,
                startDate,
                endDate,
                sortBy,
                sortOrder
            }
        );

        return {
            data: data.data,
            options: {
                pagination: {
                    total: data.total,
                    page: data.page,
                    totalPages: data.totalPages,
                    limit: data.limit
                }
            }
        };
    } catch (error) {
        return Promise.reject(error);
    }
};

const getAllFollowupLeadByCompanyWithPagination = async (
    role,
    companyId,
    userId,
    page,
    limit,
    filters
) => {
    try {
      const skip = (page - 1) * limit

      // First, get all LeadStatus IDs where showFollowUp is true
      const followupStatusIds = await LeadStatus.find({
        companyId,
        showFollowUp: true
        // deleted: false,
        // isActive: true,
      }).select('_id')
      const statusIds = followupStatusIds.map((status) => status._id)
      // Base query with company and deleted condition
      let query = {
        companyId: companyId,
        leadUpdated:true,
        leadStatus: { $in: statusIds } // Only include leads with status that have showFollowUp true
      }

    ///skip if leadUpdated is false
         

      // Add assignedAgent filter only for User role
      if (role !== userRoles.SUPER_ADMIN) {
        if (role === userRoles.USER) {
          // For regular users - show only their own data
          query.assignedAgent = userId
        } else if (role === userRoles.TEAM_ADMIN) {
          // For Team Leaders - show their data AND data of users assigned to them
          query.$or = [
            { assignedAgent: userId }, // TL's own data
            {
              assignedAgent: {
                $in: await User.distinct('_id', { assignedTL: userId })
              }
            } // Data where agent is any user assigned to this TL
          ]
        }
      }

      // Add date range filter if provided
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate)
        start.setUTCHours(0, 0, 0, 0)
        const end = new Date(filters.endDate)
        end.setUTCHours(23, 59, 59, 999)

        query.followUpDate = {
          $gte: start,
          $lte: end
        }
      }

      // Add specific filters if provided
      if (filters.leadStatus) {
        console.log('filters.leadStatus', filters.leadStatus)
        query.leadStatus = new Types.ObjectId(filters.leadStatus)
      }
      if (filters.assignedAgent) {
        query.assignedAgent = new Types.ObjectId(filters.assignedAgent)
      }
      if (filters.leadSource) {
        query.leadSource = new Types.ObjectId(filters.leadSource)
      }
      if (filters.productService) {
        query.productService = new Types.ObjectId(filters.productService)
      }

      // Search functionality
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { contactNumber: { $regex: filters.search, $options: 'i' } },
          { city: { $regex: filters.search, $options: 'i' } }
        ]
      }

      // Build sort object
      const sortObj = {}
      sortObj[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1

      // Get total count for pagination
      const total = await Lead.countDocuments(query)
      // Get paginated leads
      const leads = await Lead.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortObj)
        .populate([
          {
            path: 'leadSource',
            select: '_id name',
            model: 'LeadSource'
          },
          {
            path: 'productService',
            select: '_id name',
            model: 'ProductService'
          },
          {
            path: 'assignedAgent',
            select: '_id name',
            model: 'User'
          },
          {
            path: 'leadStatus',
            select: '_id name color',
            model: 'LeadStatus'
          }
        ])
        .lean()
      return {
        data: leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
        console.error('Error in getAllFollowupLeadByCompanyWithPagination:', error);
        throw error;
    }
};

////// get all imported lead
exports.getAllImportedLeadsByCompany = async (params, user) => {
    try {
        if (!user?.companyId || !user?._id) {
            throw new Error('Invalid user data');
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            leadStatus,
            assignedAgent,
            leadSource,
            productService,
            startDate,
            endDate,
            sortBy = 'followUpDate',
            sortOrder = 'asc'
        } = params;

        const data = await getAllImportedLeadsByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            Number(page),
            Number(limit),
            {
                search,
                leadStatus,
                assignedAgent,
                leadSource,
                productService,
                startDate,
                endDate,
                sortBy,
                sortOrder
            }
        );

        return {
            data: data.data,
            options: {
                pagination: {
                    total: data.total,
                    page: data.page,
                    totalPages: data.totalPages,
                    limit: data.limit
                }
            }
        };
    } catch (error) {
        return Promise.reject(error);
    }
};

const getAllImportedLeadsByCompanyWithPagination = async (
  role,
  companyId,
  userId,
  page,
  limit,
  filters
) => {
  try {
    const skip = (page - 1) * limit

    // First, get all LeadStatus IDs where showFollowUp is true
    const importedStatusIds = await LeadStatus.find({
      companyId,
      showImported: true
      // deleted: false,
      // isActive: true,
    }).select('_id')
    const statusIds = importedStatusIds.map((status) => status._id)

    let query = {
      companyId: companyId,
      leadStatus: { $in: statusIds }, // Only include leads with status that have showFollowUp true
      leadUpdated:false,
      leadAddType: 'Import'
    }
    // Add assignedAgent filter only for User role
    if (role !== userRoles.SUPER_ADMIN) {
      if (role === userRoles.USER) {
        // For regular users - show only their own data
        query.assignedAgent = userId
      } else if (role === userRoles.TEAM_ADMIN) {
        // For Team Leaders - show their data AND data of users assigned to them
        query.$or = [
          { assignedAgent: userId }, // TL's own data
          {
            assignedAgent: {
              $in: await User.distinct('_id', { assignedTL: userId })
            }
          } // Data where agent is any user assigned to this TL
        ]
      }
    }

    // Add date range filter if provided
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(filters.endDate)
      end.setUTCHours(23, 59, 59, 999)

      query.followUpDate = {
        $gte: start,
        $lte: end
      }
    }

    // Add specific filters if provided
    if (filters.leadStatus) {
      console.log('filters.leadStatus', filters.leadStatus)
      query.leadStatus = new Types.ObjectId(filters.leadStatus)
    }
    if (filters.assignedAgent) {
      query.assignedAgent = new Types.ObjectId(filters.assignedAgent)
    }
    if (filters.leadSource) {
      query.leadSource = new Types.ObjectId(filters.leadSource)
    }
    if (filters.productService) {
      query.productService = new Types.ObjectId(filters.productService)
    }

    // Search functionality
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { contactNumber: { $regex: filters.search, $options: 'i' } },
        { city: { $regex: filters.search, $options: 'i' } }
      ]
    }

    // Build sort object
    const sortObj = {}
    sortObj[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1

    // Get total count for pagination
    const total = await Lead.countDocuments(query)
    // Get paginated leads
    const leads = await Lead.find(query)
      .skip(skip)
      .limit(limit)
      .sort(sortObj)
      .populate([
        {
          path: 'leadSource',
          select: '_id name',
          model: 'LeadSource'
        },
        {
          path: 'productService',
          select: '_id name',
          model: 'ProductService'
        },
        {
          path: 'assignedAgent',
          select: '_id name',
          model: 'User'
        },
        {
          path: 'leadStatus',
          select: '_id name color',
          model: 'LeadStatus'
        }
      ])
      .lean()
    return {
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error('Error in getAllFollowupLeadByCompanyWithPagination:', error)
    throw error
  }
}

/////// get all outsouce lead 
exports.getAllOutsourcedLeadsByCompany = async (params, user) => {
    try {
        if (!user?.companyId || !user?._id) {
            throw new Error('Invalid user data');
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            leadStatus,
            assignedAgent,
            leadSource,
            productService,
            startDate,
            endDate,
            sortBy = 'followUpDate',
            sortOrder = 'asc'
        } = params;

        const data = await getAllOutsourcedLeadsByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            Number(page),
            Number(limit),
            {
                search,
                leadStatus,
                assignedAgent,
                leadSource,
                productService,
                startDate,
                endDate,
                sortBy,
                sortOrder
            }
        );

        return {
            data: data.data,
            options: {
                pagination: {
                    total: data.total,
                    page: data.page,
                    totalPages: data.totalPages,
                    limit: data.limit
                }
            }
        };
    } catch (error) {
        return Promise.reject(error);
    }
};

const getAllOutsourcedLeadsByCompanyWithPagination = async (
    role,
    companyId,
    userId,
    page,
    limit,
    filters
) => {
    try {
        const skip = (page - 1) * limit;
         
        // First, get all LeadStatus IDs where showFollowUp is true
        const OutSourcedStatusIds = await LeadStatus
            .find({
                companyId,
                showOutSourced: true,
                // deleted: false,
                // isActive: true,
            })
            .select("_id");
        const statusIds = OutSourcedStatusIds.map((status) => status._id);
        // Base query with company and deleted condition
        let query = {
            companyId: companyId,
            leadStatus: { $in: statusIds }, // Only include leads with status that have showFollowUp true
            leadUpdated:false,
            leadAddType:'ThirdParty'
        };
        // Add assignedAgent filter only for User role
      if (role !== userRoles.SUPER_ADMIN) {
        if (role === userRoles.USER) {
          // For regular users - show only their own data
          query.assignedAgent = userId
        } else if (role === userRoles.TEAM_ADMIN) {
          // For Team Leaders - show their data AND data of users assigned to them
          query.$or = [
            { assignedAgent: userId }, // TL's own data
            {
              assignedAgent: {
                $in: await User.distinct('_id', { assignedTL: userId })
              }
            } // Data where agent is any user assigned to this TL
          ]
        }
      }
       
        // Add date range filter if provided
        if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setUTCHours(23, 59, 59, 999);

            query.followUpDate = {
                $gte: start,
                $lte: end
            };
        }

        // Add specific filters if provided
        if (filters.leadStatus) {
            console.log("filters.leadStatus",filters.leadStatus)
            query.leadStatus =  new Types.ObjectId(filters.leadStatus);
        }
        if (filters.assignedAgent) {
            query.assignedAgent =  new Types.ObjectId(filters.assignedAgent);
        }
        if (filters.leadSource) {
            query.leadSource =  new Types.ObjectId(filters.leadSource);
        }
        if (filters.productService) {
            query.productService =  new Types.ObjectId(filters.productService);
        }


        // Search functionality
        if (filters.search) {
            query.$or = [
                { firstName: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
                { contactNumber: { $regex: filters.search, $options: 'i' } },
                { city: { $regex: filters.search, $options: 'i' } }
            ];
        }


         // Build sort object
         const sortObj = {};
         sortObj[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;

        // Get total count for pagination
        const total = await Lead.countDocuments(query);
        // Get paginated leads
        const leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .sort(sortObj)
            .populate([
                {
                    path: 'leadSource',
                    select: '_id name',
                    model: 'LeadSource'
                },
                {
                    path: 'productService',
                    select: '_id name',
                    model: 'ProductService'
                },
                {
                    path: 'assignedAgent',
                    select: '_id name',
                    model: 'User'
                },
                {
                    path: 'leadStatus',
                    select: '_id name color',
                    model: 'LeadStatus'
                }
            ])
            .lean();
        return {
            data: leads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    } catch (error) {
        console.error('Error in getAllFollowupLeadByCompanyWithPagination:', error);
        throw error;
    }
};





///////////  Lead Update 
exports.getLeadUpdate = async (id, data, user) => {
    try {
        // Check if lead exists and belongs to company
        const existingLead = await Lead.findOne({
            _id: id,
            companyId: user.companyId,
        });

        if (!existingLead) {
            throw {
                code: 404,
                message: "Lead not found",
            };
        }

        // Check for contact number uniqueness if it's being updated
        if (data.contactNumber && data.contactNumber !== existingLead.contactNumber) {
            const bloomFilterManager = LeadBloomFilterManager.getInstance();
            const mightExist = await bloomFilterManager.mightHaveDuplicate(
                user.companyId,
                data.contactNumber,
            );

            if (mightExist) {
                const duplicateLead = await Lead.findOne({
                    companyId: user.companyId,
                    contactNumber: data.contactNumber,
                    _id: { $ne: id }, // Exclude current lead
                });
                if (duplicateLead) {
                    throw {
                        code: 400,
                        message: "Lead with this contact number already exists",
                    };
                }
            }
            // Update bloom filter with new number
            bloomFilterManager.addContactNumber(user.companyId, data.contactNumber);
        }
        // Validate history data
        const { error } =  validateLeadHistory({
            status: data.leadStatus,
            followUpDate: data.followUpDate,
            comment: data.comment,
        });
       
        if (error) {
            throw {
                code: 400,
                message: error.details[0].message,
            };
        }

        // Add lead history - Fixed the parameter name from 'id' to 'leadId'
        const LeadHistoryController = await leadHistoryController.addLeadHistory({
            leadId: id,  // Changed from 'id' to 'leadId'
            commentedBy: user._id,
            companyId: user.companyId,
            status: data.leadStatus,
            followupDate: data.followUpDate,
            comment: data.comment || `Status updated to ${data.leadStatus}`,
        });
        // Update lead
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            {
                ...data,
                calanderMassage: data?.comment || null,
                updatedBy: user._id,
                updatedAt: new Date(),
                leadUpdated:true,
            },
            { new: true },
        );

        return { UpdatedLead: updatedLead, LeadHistory: LeadHistoryController };

    } catch (error) {
        // Added proper error handling
        console.error('Lead update error:', error);
        throw error;
    }
};


///////// get lead details

exports.getLeadDetails=async (leadId,{},user)=>{
    try {
      const lead = await Lead.findOne({
        _id: leadId,
        companyId:user.companyId,
      })
        .populate([
          {
            path: "leadSource", // lowercase to match schema
            select: "name",
            model: LeadSource, // add model reference
          },
          {
            path: "productService",
            select: "name",
            model: ProductService,
          },
          {
            path: "assignedAgent",
            select: "name", // added email field if needed
            model: User,
          },
          {
            path: "leadStatus",
            select: "name",
            model: LeadStatus,
          },
        ])
        .lean();

      if (!lead) {
        throw {
          code: 404,
          message: "Lead not found",
        };
      }

      // Get lead history

      const leadObjectId = new Types.ObjectId(leadId);
      // const companyObjectId = new Types.ObjectId(companyId);
      const history = await LeadHistory.aggregate([
        {
          $match: {
            leadId: leadObjectId,
            companyId:user.companyId,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "commentedBy",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "leadstatuses",
            localField: "status",
            foreignField: "_id",
            as: "statusInfo",
          },
        },
        { $unwind: "$user" },
        { $unwind: "$statusInfo" },
        {
          $project: {
            COMMENTED_BY: "$user.name",
            DATE: "$date",
            STATUS: "$statusInfo.name",
            FOLLOWUP_DATE: "$followupDate",
            COMMENT: "$comment",
          },
        },
        { $sort: { DATE: -1 } },
      ]);

      //////  Get Geo-Location
      const geoLocation = await GeoLocationModel.aggregate([
        {
            $match: {
              leadId: leadObjectId,
              companyId:user.companyId,
            },
          },
        ]);
      // Format the response
      const formattedResponse = {
        leadDetails: {
          lead,
          history,
          geoLocation
        },
      };

      return formattedResponse;
    } catch (error) {
        
    }
}


//////////  lead bulk update 
exports.bulkUpdateLeads = async (data, user) => {
    try {
        const { leadIds, assignedAgent, leadStatus } = data;
        // Build update object
        const updateData = {};
        if (assignedAgent) updateData.assignedAgent = new Types.ObjectId(assignedAgent);
        if (leadStatus) updateData.leadStatus = new Types.ObjectId(leadStatus);

        // Update multiple documents
        const result = await Lead.updateMany(
            { 
                _id: { $in: leadIds.map(id => new Types.ObjectId(id)) },
                companyId: user.companyId // Security check
            },
            { $set: updateData },
            { new: true }
        );

        return { 
            modifiedCount: result.modifiedCount,
            message: `Successfully updated ${result.modifiedCount} leads`
        };

    } catch (error) {
        console.error('Bulk Update Leads Error:', error);
        throw error;
    }
};


//////// bulk delete lead
exports.bulkDeleteLeads = async (data, user) => {
    try {
        const { leadIds } = data;

        // Delete multiple documents
        const result = await Lead.deleteMany({
            _id: { $in: leadIds.map(id =>new Types.ObjectId(id)) },
            companyId: user.companyId // Security check: only delete leads from user's company
        });

        return {
            deletedCount: result.deletedCount,
            message: `Successfully deleted ${result.deletedCount} leads`
        };

    } catch (error) {
        console.error('Bulk Delete Leads Error:', error);
        throw error;
    }
};



///////////  export excel file
exports.exportExcel = async (data, user) => {
    try {
        // Fetch leads data
        const leads = await Lead.find({
          companyId: user.companyId, // Security check: only fetch leads from user's company
        })
            .select('firstName contactNumber leadSource assignedAgent leadStatus productService createdAt')
            .lean();

        if (!leads || leads.length === 0) {
            throw new Error('No leads found to export');
        }

        // Transform data for Excel format
        const excelData = leads.map(lead => ({
            'Name': lead?.firstName || '',
            'Number': lead?.contactNumber || '',
            'Lead Source': lead?.leadSource || '',
            'Agent': lead?.assignedAgent || '',
            'Status': lead?.leadStatus || '',
            'Service': lead?.productService || '',
            'Created Date': lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const colWidths = [
            { wch: 20 }, // Name
            { wch: 15 }, // Number
            { wch: 15 }, // Lead Source
            { wch: 20 }, // Agent
            { wch: 12 }, // Status
            { wch: 25 }, // Service
            { wch: 15 }  // Created Date
        ];
        worksheet['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, {
            type: 'base64', // Changed to base64 for easier transmission
            bookType: 'xlsx',
            bookSST: false
        });

        // Return the file details
        return {
            fileData: excelBuffer,
            fileName: `leads_export_${new Date().getTime()}.xlsx`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

    } catch (error) {
        console.error('Excel Export Error:', error);
        return Promise.reject(error);
    }
};

////////   export Pdf file
exports.exportPDF = async (data, user) => {
  try {
      // Fetch leads data
      const leads = await Lead.find({
        companyId: user.companyId, // Security check: only fetch leads from user's company
      })
          .select('firstName contactNumber leadSource assignedAgent leadStatus productService createdAt')
          .lean();

      if (!leads || leads.length === 0) {
          throw new Error('No leads found to export');
      }

      // Create PDF document
      const doc = new PDFDocument();
      const chunks = [];

      // Collect PDF chunks
      doc.on('data', chunk => chunks.push(chunk));

      // Create promise to handle PDF generation
      const pdfPromise = new Promise((resolve, reject) => {
          doc.on('end', () => {
              const pdfBuffer = Buffer.concat(chunks);
              resolve(pdfBuffer.toString('base64'));
          });
          doc.on('error', reject);
      });

      // Add header
      doc.fontSize(16)
         .text('Leads Report', { align: 'center' })
         .moveDown();

      // Add table headers
      const headers = ['Name', 'Number', 'Lead Source', 'Agent', 'Status', 'Service', 'Created Date'];
      const startX = 50;
      let startY = 100;
      const rowHeight = 30;
      const colWidth = 75;

      // Draw headers with background
      doc.fillColor('#f0f0f0')
         .rect(startX - 5, startY - 15, colWidth * headers.length + 10, rowHeight)
         .fill();
      
      headers.forEach((header, i) => {
          doc.fillColor('#000')
             .fontSize(10)
             .text(header, startX + (i * colWidth), startY - 10, { 
                 width: colWidth,
                 align: 'left'
             });
      });

      startY += 20;

      // Draw leads data
      leads.forEach((lead, index) => {
          // Add new page if needed
          if (startY > 700) {
              doc.addPage();
              startY = 50;
          }

          // Alternate row background for better readability
          if (index % 2 === 0) {
              doc.fillColor('#f9f9f9')
                 .rect(startX - 5, startY - 5, colWidth * headers.length + 10, rowHeight)
                 .fill();
          }

          doc.fillColor('#000')
             .fontSize(9);

          const rowData = [
              lead?.firstName || '',
              lead?.contactNumber || '',
              lead?.leadSource || '',
              lead?.assignedAgent || '',
              lead?.leadStatus || '',
              lead?.productService || '',
              lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''
          ];

          rowData.forEach((text, i) => {
              // Truncate text if too long
              const truncatedText = text.toString().length > 15 
                  ? text.toString().substring(0, 12) + '...' 
                  : text.toString();

              doc.text(truncatedText, 
                  startX + (i * colWidth), 
                  startY, 
                  { 
                      width: colWidth - 5,
                      align: 'left'
                  }
              );
          });

          startY += rowHeight;
      });

      // End the document and get base64 data
      doc.end();
      const pdfData = await pdfPromise;

      return {
          fileData: pdfData,
          fileName: `leads_export_${new Date().getTime()}.pdf`,
          contentType: 'application/pdf'
      };

  } catch (error) {
      console.error('PDF Export Error:', error);
      return Promise.reject(error);
  }
};













