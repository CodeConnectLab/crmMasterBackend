const LeadModel=require('../lead/lead.model');
const LeadStatusModel=require('../leadStatus/leadStatus.model')

exports.getCalendarData=async({},user)=>{
    try {
        const Calenderdata = await LeadModel.find(
            {
                assignedAgent: user._id,
                companyId: user.companyId,
                addCalender: true
            },
            'firstName assignedAgent comment followUpDate' // Select only these fields
        ).populate({
            path: 'assignedAgent',
            select: '_id name',
            model: 'User'
        });
              return Calenderdata;
    } catch (error) {
        console.error('Lead update error:', error);
        throw error;
    }
    
}


exports.getDashboardMetrics = async (params, user) => {
    try {
        const { startDate, endDate } = params;
        
        // Convert dates to UTC
        const start = startDate ? new Date(startDate) : new Date();
        start.setUTCHours(0, 0, 0, 0); 
        
        const end = endDate ? new Date(endDate) : new Date();
        end.setUTCHours(23, 59, 59, 999);

        // Get previous period for comparison
        const previousPeriodStart = new Date(start);
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        
        const previousPeriodEnd = new Date(end);
        previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

        // Base query for company
        const baseQuery = {
            companyId: user.companyId,
           // createdAt: { $gte: start, $lte: end }
        };

        // Previous period query
        const previousQuery = {
            companyId: user.companyId,
            createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        };

        // Get followup status IDs
        const followupStatusIds = await LeadStatusModel
            .find({ companyId: user.companyId, showFollowUp: true })
            .distinct('_id');

        // Fetch all metrics in parallel
        const [
            currentLeads,
            previousLeads,
            followupLeads,
            previousFollowupLeads,
            importedLeads,
            previousImportedLeads,
            outsourcedLeads,
            previousOutsourcedLeads
        ] = await Promise.all([
            // Total Leads
            LeadModel.countDocuments(baseQuery),
            LeadModel.countDocuments(previousQuery),
            
            // Follow Up Leads
            LeadModel.countDocuments({ ...baseQuery, leadStatus: { $in: followupStatusIds } }),
            LeadModel.countDocuments({ ...previousQuery, leadStatus: { $in: followupStatusIds } }),
            
            // Imported Leads
            LeadModel.countDocuments({ ...baseQuery, leadAddType: 'Import' }),
            LeadModel.countDocuments({ ...previousQuery, leadAddType: 'Import' }),
            
            // Outsourced Leads
            LeadModel.countDocuments({ ...baseQuery, leadAddType: 'ThirdParty' }),
            LeadModel.countDocuments({ ...previousQuery, leadAddType: 'ThirdParty' }),

            
        ]);

        // Calculate percentage changes
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) return 0;
            return ((current - previous) / previous * 100).toFixed(2);
        };

        // Format numbers with K for thousands
        const formatNumber = (num) => {
            return num >= 1000 ? (num / 1000).toFixed(3) + 'K' : num;
        };

        return {
            topMetrics: {
                allLeads: {
                    value: formatNumber(currentLeads),
                    change: calculatePercentageChange(currentLeads, previousLeads)
                },
                followUpLeads: {
                    value: formatNumber(followupLeads),
                    change: calculatePercentageChange(followupLeads, previousFollowupLeads)
                },
                importedLeads: {
                    value: formatNumber(importedLeads),
                    change: calculatePercentageChange(importedLeads, previousImportedLeads)
                },
                outsourcedLeads: {
                    value: formatNumber(outsourcedLeads),
                    change: calculatePercentageChange(outsourcedLeads, previousOutsourcedLeads)
                }
            },
           
        };
    } catch (error) {
        console.error('Dashboard Metrics Error:', error);
        throw error;
    }
};
