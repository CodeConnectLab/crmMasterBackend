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

exports.createLeadByCompany = async (data, user) => {
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
                    return {
                        message: "Lead with this contact number already exists",
                    };

                }
            }
            bloomFilterManager.addContactNumber(user.companyId, data.contactNumber);
        }
        const lead = await Lead.create({
            ...data,
            companyId: user.companyId,
            createdBy: user._id,
        });
        return lead;
    } catch (error) {
        return Promise.reject(error);
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
            search = ''
        } = params;

        const data = await getAllLeadByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            Number(page),
            Number(limit),
            {
                search
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


        const skip = (page - 1) * limit;

        // Base query with company and deleted condition
        let query = {
            companyId: companyId,
            //  deleted: false
        };

        // Add assignedAgent filter only for User role
        if (role !== 'Super Admin') {
            query.assignedAgent = userId;
        } else {
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



        // Get total count for pagination
        const total = await Lead.countDocuments(query);


        // Get paginated leads
        const leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
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
                    select: '_id name',
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
            search = ''
        } = params;

        const data = await getAllFollowupLeadByCompanyWithPagination(
            user.role,
            user.companyId,
            user._id,
            Number(page),
            Number(limit),
            {
                search
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
        const skip = (page - 1) * limit;

        // First, get all LeadStatus IDs where showFollowUp is true
        const followupStatusIds = await LeadStatus
            .find({
                companyId,
                showFollowUp: true,
                // deleted: false,
                // isActive: true,
            })
            .select("_id");
        const statusIds = followupStatusIds.map((status) => status._id);
        // Base query with company and deleted condition
        let query = {
            companyId: companyId,
            leadStatus: { $in: statusIds }, // Only include leads with status that have showFollowUp true
        };
        // Add assignedAgent filter only for User role
        if (role !== 'Super Admin') {
            query.assignedAgent = userId;
        } else {
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
        // Get total count for pagination
        const total = await Lead.countDocuments(query);
        // Get paginated leads
        const leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
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
                updatedBy: user._id,
                updatedAt: new Date(),
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
        { $sort: { date: -1 } },
      ]);
      // Format the response
      const formattedResponse = {
        leadDetails: {
          lead,
          history,
        },
      };

      return formattedResponse;
    } catch (error) {
        
    }
}














