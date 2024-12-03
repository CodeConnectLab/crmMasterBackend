const LeadBloomFilterManager = require('../../utility/BloomFilter/LeadBloomFilterManager');
const Lead = require('./lead.model');
const LeadSource = require('../leadSources/leadSources.model');
const ProductService = require('../productService/productService.model')
const User = require('../user/user.model')
const LeadStatus = require('../leadStatus/leadStatus.model')

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
        console.error('Error in getAllFollowupLeadByCompanyWithPagination:', error);
        throw error;
    }
};








