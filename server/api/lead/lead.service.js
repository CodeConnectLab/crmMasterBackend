const LeadBloomFilterManager = require('../../utility/BloomFilter/LeadBloomFilterManager');
const Lead = require('./lead.model');
const LeadSource = require('../leadSources/leadSources.model');
const ProductService = require('../productService/productService.model')
const User = require('../user/user.model')
const LeadStatus = require('../leadStatus/leadStatus.model');
const {validateLeadHistory} = require('./lead.validation');
const {leadHistoryController} =require('./leadHistory.service');
const LeadHistory=require('./leadHistory.model');
const leadTouchService = require('../leadTouch/leadTouch.service');
const { Types } = require('mongoose');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const GeoLocationModel = require('../geoLocation/geoLocation.model');
const userRoles = require('../../config/constants/userRoles');
// const scheduleLeadNotification  = require('../../queues/notificationQueue').scheduleLeadNotification;

/** Escape user-provided search text for safe use inside MongoDB `$regex`. */
function escapeMongoRegexChars(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Branches matched with OR — used for text search across lead fields. */
function buildLeadSearchOrClause(searchRaw) {
    if (searchRaw == null || typeof searchRaw !== 'string') return null;
    const trimmed = searchRaw.trim();
    if (!trimmed) return null;
    const safe = escapeMongoRegexChars(trimmed);
    return [
        { firstName: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { contactNumber: { $regex: safe, $options: 'i' } },
        { city: { $regex: safe, $options: 'i' } }
    ];
}

/**
 * Keeps visibility intact for Team Leaders: do not overwrite `query.$or` used for TL scope.
 */
function mergeLeadSearchIntoQuery(query, searchRaw) {
    const searchOr = buildLeadSearchOrClause(searchRaw);
    if (!searchOr) return;

    if (query.$or) {
        const visibilityBranch = { $or: query.$or };
        delete query.$or;
        query.$and = [...(query.$and || []), visibilityBranch, { $or: searchOr }];
        return;
    }
    query.$or = searchOr;
}

/** Apply visibility for list/export: Employee = own leads; TL = self + agents with assignedTL; Super Admin = company only */
async function scopeLeadQueryToUserRole(query, role, companyId, userId) {
    query.companyId = companyId;
    if (role !== userRoles.SUPER_ADMIN) {
        if (role === userRoles.USER) {
            query.assignedAgent = userId;
        } else if (role === userRoles.TEAM_ADMIN) {
            query.$or = [
                { assignedAgent: userId },
                {
                    assignedAgent: {
                        $in: await User.distinct('_id', { assignedTL: userId })
                    }
                }
            ];
        }
    }
}

// Sentinel value used by the advanced filter to mean "no value in this category"
// (e.g. unassigned agent, no status). MongoDB `{ field: null }` matches both
// explicit null and a missing field, which is exactly what we want.
const FILTER_NONE = 'none';

/**
 * Apply an optional reference-field filter (leadStatus / leadSource / productService).
 * Supports the FILTER_NONE sentinel to match leads that have no value in that field.
 */
function applyRefFilter(query, field, raw) {
    if (raw == null || raw === '') return;
    query[field] = raw === FILTER_NONE ? null : new Types.ObjectId(raw);
}

/**
 * Optional `assignedAgent` filter — never lets Employees (or TLs) widen scope beyond what their role allows.
 */
async function applyAssignableAgentFilter(query, role, userId, filterAgentIdRaw) {
    if (filterAgentIdRaw == null || filterAgentIdRaw === '') return;

    // "Unassigned" filter: only Super Admins can see company-wide unassigned leads.
    // Employees / Team Admins are already scoped to their own (assigned) leads, so the
    // filter is a no-op for them rather than leaking unassigned leads across roles.
    if (filterAgentIdRaw === FILTER_NONE) {
        if (role === userRoles.SUPER_ADMIN) {
            query.assignedAgent = null;
        }
        return;
    }

    if (!Types.ObjectId.isValid(filterAgentIdRaw)) return;

    const filterOid = new Types.ObjectId(filterAgentIdRaw);

    if (role === userRoles.SUPER_ADMIN) {
        query.assignedAgent = filterOid;
        return;
    }

    if (role === userRoles.USER) {
        query.assignedAgent = typeof userId === 'string'
            ? new Types.ObjectId(userId)
            : userId;
        return;
    }

    if (role === userRoles.TEAM_ADMIN) {
        const teamIds = await User.distinct('_id', { assignedTL: userId });
        const allowed = new Set([
            userId?.toString?.() ?? String(userId),
            ...teamIds.map((id) => id.toString())
        ]);
        if (!allowed.has(filterOid.toString())) return;
        query.assignedAgent = filterOid;
    }
}

/** Whether the user may access a single lead row (same rules as scoped lists). */
async function userCanAccessLeadDoc(lead, user) {
    if (!lead || !user?.companyId) return false;

    const role = user.role;
    if (role === userRoles.SUPER_ADMIN) return true;

    const leadCompany = lead.companyId?.toString?.() ?? String(lead.companyId);
    if (leadCompany !== user.companyId.toString()) return false;

    const rawAgent = lead.assignedAgent;
    const agentId = rawAgent && rawAgent._id !== undefined ? rawAgent._id : rawAgent;

    if (role === userRoles.USER) {
        if (!agentId) return false;
        return agentId.toString() === user._id.toString();
    }

    if (role === userRoles.TEAM_ADMIN) {
        if (!agentId) return false;
        if (agentId.toString() === user._id.toString()) return true;
        const isTeamMember = await User.exists({
            _id: agentId,
            assignedTL: user._id
        });
        return !!isTeamMember;
    }

    return false;
}

async function fetchLeadsDocumentForExport(user) {
    const query = {};
    await scopeLeadQueryToUserRole(query, user.role, user.companyId, user._id);
    return Lead.find(query)
        .select('firstName contactNumber leadSource assignedAgent leadStatus productService createdAt')
        .populate([
            { path: 'leadSource', select: 'name', model: LeadSource },
            { path: 'productService', select: 'name', model: ProductService },
            { path: 'assignedAgent', select: 'name', model: User },
            { path: 'leadStatus', select: 'name', model: LeadStatus }
        ])
        .lean();
}

const NotificationModel = require('../notificationSetting/notificationSetting.model');
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

      //////////  call a async function for add notification in Queue
      // const notification = await NotificationModel.findOne({
      //   companyId: user.companyId,
      //   statusId: data.leadStatus, isEnabled: true
      // })
      // if (notification && data.followUpDate && (new Date(data.followUpDate) > new Date())) {
      //   await scheduleLeadNotification(lead, notification).catch((err) => {
      //     console.error('Error scheduling lead notification:', err);
      //   })
      // }

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

      const query = {}
      await scopeLeadQueryToUserRole(query, role, companyId, userId)

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
      applyRefFilter(query, 'leadStatus', filters?.leadStatus)
      await applyAssignableAgentFilter(query, role, userId, filters?.assignedAgent)
      applyRefFilter(query, 'leadSource', filters?.leadSource)
      applyRefFilter(query, 'productService', filters?.productService)

      mergeLeadSearchIntoQuery(query, filters?.search)

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
      const query = {
        companyId: companyId,
        leadUpdated:true,
        leadStatus: { $in: statusIds } // Only include leads with status that have showFollowUp true
      }

      await scopeLeadQueryToUserRole(query, role, companyId, userId)

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
      applyRefFilter(query, 'leadStatus', filters.leadStatus)
      await applyAssignableAgentFilter(query, role, userId, filters.assignedAgent)
      applyRefFilter(query, 'leadSource', filters.leadSource)
      applyRefFilter(query, 'productService', filters.productService)

      mergeLeadSearchIntoQuery(query, filters.search)

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

    // Only include leads whose status has the "Imported" toggle enabled
    // (showImported === true). Fresh leads with no status yet (null/unset) are
    // still shown. Mirrors the Outsourced Leads behaviour.
    const importedStatuses = await LeadStatus.find({
      companyId,
      showImported: true
    }).select('_id')
    const importedStatusIds = importedStatuses.map((status) => status._id)

    const query = {
      companyId: companyId,
      leadUpdated: false,
      leadAddType: 'Import',
      $or: [
        { leadStatus: { $in: importedStatusIds } },
        { leadStatus: { $exists: false } },
        { leadStatus: null }
      ]
    }
    await scopeLeadQueryToUserRole(query, role, companyId, userId)

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
    applyRefFilter(query, 'leadStatus', filters.leadStatus)
    await applyAssignableAgentFilter(query, role, userId, filters.assignedAgent)
    applyRefFilter(query, 'leadSource', filters.leadSource)
    applyRefFilter(query, 'productService', filters.productService)

    mergeLeadSearchIntoQuery(query, filters.search)

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

        // Only include leads whose status has the "Out-Sourced" toggle enabled
        // (showOutSourced === true) on the Lead Status List. Fresh leads that
        // have not been given a status yet (leadStatus null/unset) are still
        // shown, since the page is meant to surface untouched third-party leads.
        const outsourcedStatuses = await LeadStatus.find({
            companyId,
            showOutSourced: true
        }).select('_id');
        const outsourcedStatusIds = outsourcedStatuses.map((status) => status._id);

        const query = {
            companyId: companyId,
            leadUpdated: false,
            leadAddType: 'ThirdParty',
            $or: [
                { leadStatus: { $in: outsourcedStatusIds } },
                { leadStatus: { $exists: false } },
                { leadStatus: null }
            ]
        };
        await scopeLeadQueryToUserRole(query, role, companyId, userId);
       
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
        applyRefFilter(query, 'leadStatus', filters.leadStatus);
        await applyAssignableAgentFilter(query, role, userId, filters.assignedAgent);
        applyRefFilter(query, 'leadSource', filters.leadSource);
        applyRefFilter(query, 'productService', filters.productService);

        mergeLeadSearchIntoQuery(query, filters.search);


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



/* ------------------------------------------------------------------ *
 * Lead buckets: Idle / Unassigned / New (24h)
 * Generic, paginated, role-scoped list shared by all three buckets.
 * `bucketMatch` is the bucket-specific Mongo match merged into the query.
 * ------------------------------------------------------------------ */
const LEAD_LIST_POPULATE = [
    { path: 'leadSource', select: '_id name', model: 'LeadSource' },
    { path: 'productService', select: '_id name', model: 'ProductService' },
    { path: 'assignedAgent', select: '_id name', model: 'User' },
    { path: 'leadStatus', select: '_id name color', model: 'LeadStatus' }
];

const getLeadsBucketWithPagination = async (role, companyId, userId, page, limit, filters, bucketMatch) => {
    try {
        const skip = (page - 1) * limit;
        const query = { companyId, ...bucketMatch };
        await scopeLeadQueryToUserRole(query, role, companyId, userId);

        if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setUTCHours(23, 59, 59, 999);
            query.followUpDate = { $gte: start, $lte: end };
        }

        applyRefFilter(query, 'leadStatus', filters.leadStatus);
        await applyAssignableAgentFilter(query, role, userId, filters.assignedAgent);
        applyRefFilter(query, 'leadSource', filters.leadSource);
        applyRefFilter(query, 'productService', filters.productService);
        mergeLeadSearchIntoQuery(query, filters.search);

        const sortObj = {};
        sortObj[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;

        const total = await Lead.countDocuments(query);
        const leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .sort(sortObj)
            .populate(LEAD_LIST_POPULATE)
            .lean();

        return { data: leads, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        console.error('Error in getLeadsBucketWithPagination:', error);
        throw error;
    }
};

const runBucket = async (params, user, bucketMatch) => {
    if (!user?.companyId || !user?._id) throw new Error('Invalid user data');
    const {
        page = 1, limit = 10, search = '', leadStatus, assignedAgent,
        leadSource, productService, startDate, endDate,
        sortBy = 'createdAt', sortOrder = 'desc'
    } = params;
    const data = await getLeadsBucketWithPagination(
        user.role, user.companyId, user._id, Number(page), Number(limit),
        { search, leadStatus, assignedAgent, leadSource, productService, startDate, endDate, sortBy, sortOrder },
        bucketMatch
    );
    return {
        data: data.data,
        options: { pagination: { total: data.total, page: data.page, totalPages: data.totalPages, limit: data.limit } }
    };
};

// Idle = assigned to someone but no status set yet (assigned, no work done).
exports.getAllIdleLeadsByCompany = (params, user) =>
    runBucket(params, user, { assignedAgent: { $ne: null }, leadStatus: null });

// Unassigned = no agent assigned at all.
exports.getAllUnassignedLeadsByCompany = (params, user) =>
    runBucket(params, user, { assignedAgent: null });

// New = created within the last 24 hours (rolling) AND untouched: no status
// and no agent assigned yet.
exports.getAllNewLeadsByCompany = (params, user) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return runBucket(params, user, {
        createdAt: { $gte: cutoff },
        assignedAgent: null,
        leadStatus: null
    });
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

        if (!(await userCanAccessLeadDoc(existingLead, user))) {
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

        // ---- Engagement detection -------------------------------------------------
        // A LeadHistory row counts as a genuine engagement when the employee actually
        // typed a comment (per product spec: the comment itself is the engagement
        // signal — no minimum length, just non-empty).
        const rawComment = typeof data.comment === 'string' ? data.comment.trim() : '';
        const isEngagement = rawComment.length > 0;
        const source = data.source || 'API';

        // If the client passed clientNonce (mobile / web Log-Contact flow) OR a
        // matching INITIATED touch exists in the last 30 min, link them so this
        // engagement counts as "Verified" rather than "Low confidence".
        let linkedTouch = null;
        if (isEngagement) {
            try {
                linkedTouch = await leadTouchService.findOpenTouchForEngagement({
                    companyId: user.companyId,
                    userId: user._id,
                    leadId: id,
                    clientNonce: data.clientNonce,
                });
            } catch (touchErr) {
                // Non-fatal: failing to find a touch shouldn't block the lead update.
                console.error('Touch lookup failed during lead update:', touchErr);
            }
        }

        // Add lead history - Fixed the parameter name from 'id' to 'leadId'
        const LeadHistoryController = await leadHistoryController.addLeadHistory({
            leadId: id,  // Changed from 'id' to 'leadId'
            commentedBy: user._id,
            companyId: user.companyId,
            status: data.leadStatus,
            followupDate: data.followUpDate,
            comment: data.comment || `Status updated to ${data.leadStatus}`,
            isEngagement,
            source,
            touchId: linkedTouch?._id,
        });

        // Promote the linked touch to ENGAGED so leaderboards can count it as
        // "Verified" (tap + comment within 30 min by the same user).
        if (isEngagement && linkedTouch && LeadHistoryController?._id) {
            try {
                await leadTouchService.markTouchEngaged(
                    linkedTouch._id,
                    LeadHistoryController._id
                );
            } catch (markErr) {
                console.error('Failed to mark touch engaged:', markErr);
            }
        }

        // Build the Lead update — strip client-only fields that aren't part of the schema.
        const { clientNonce: _cn, source: _src, ...leadFields } = data;

        // Bump engagement denorm counters so reports / list views don't need to aggregate.
        const leadSetOps = {
            ...leadFields,
            calanderMassage: data?.comment || null,
            updatedBy: user._id,
            updatedAt: new Date(),
            leadUpdated: true,
        };
        const leadUpdateOps = { $set: leadSetOps };
        if (isEngagement) {
            const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
            leadUpdateOps.$set.lastEngagedAt = new Date();
            leadUpdateOps.$inc = { [`engagementCountByDay.${today}`]: 1 };
        }

        // Update lead
        const updatedLead = await Lead.findByIdAndUpdate(id, leadUpdateOps, {
            new: true,
        });

        return {
            UpdatedLead: updatedLead,
            LeadHistory: LeadHistoryController,
            engagement: {
                recorded: isEngagement,
                grade: isEngagement
                    ? linkedTouch
                        ? 'verified'
                        : 'low_confidence'
                    : 'none',
                touchId: linkedTouch?._id || null,
            },
        };

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

      if (!(await userCanAccessLeadDoc(lead, user))) {
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
        throw error;
    }
};


//////////  lead bulk update 
exports.bulkUpdateLeads = async (data, user) => {
    try {
        const { leadIds, assignedAgent, leadStatus } = data;
        // Build update object
        const updateData = {};
        if (assignedAgent) updateData.assignedAgent = new Types.ObjectId(assignedAgent);
        if (leadStatus) updateData.leadStatus = new Types.ObjectId(leadStatus);
        // Assigning an agent or status counts as the lead being worked, so mark it
        // updated — this moves it off the Outsourced/Imported "untouched" lists.
        if (assignedAgent || leadStatus) updateData.leadUpdated = true;

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
        const leads = await fetchLeadsDocumentForExport(user);

        if (!leads || leads.length === 0) {
            throw new Error('No leads found to export');
        }

        // Transform data for Excel format
        const excelData = leads.map(lead => ({
            'Name': lead?.firstName || '',
            'Number': lead?.contactNumber || '',
            'Lead Source': lead?.leadSource?.name || '',
            'Agent': lead?.assignedAgent?.name || '',
            'Status': lead?.leadStatus?.name || '',
            'Service': lead?.productService?.name || '',
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
      const leads = await fetchLeadsDocumentForExport(user);

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
              lead?.leadSource?.name || '',
              lead?.assignedAgent?.name || '',
              lead?.leadStatus?.name || '',
              lead?.productService?.name || '',
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













