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
      const { startDate, endDate } = params

      // Convert dates to UTC
      const start = startDate ? new Date(startDate) : new Date()
      start.setUTCHours(0, 0, 0, 0)

      const end = endDate ? new Date(endDate) : new Date()
      end.setUTCHours(23, 59, 59, 999)
      

      const topMetrics = await topMetricss(start,end,user)
    
      const activityMetrics= await activityMetricss(start,end,user)
      
      const performanceMetrics= await performanceMetricss(start,end,user)
      

      return {
        topMetrics,
        activityMetrics,
        performanceMetrics
      }
    } catch (error) {
        console.error('Dashboard Metrics Error:', error);
        throw error;
    }
};


const topMetricss = async (start, end, user) => {
  // Base query for current period
  const baseQuery = {
    companyId: user.companyId
    // createdAt: { $gte: start, $lte: end }
  }

  // Previous period query
  const previousQuery = {
    companyId: user.companyId,
    createdAt: {
      // $gte: registerdate,
      $lt: start
    }
  }

  // Get followup status IDs
  const followupStatusIds = await LeadStatusModel.find({
    companyId: user.companyId,
    showFollowUp: true
  }).distinct('_id')

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
    LeadModel.countDocuments({
      ...baseQuery,
      leadStatus: { $in: followupStatusIds }
    }),
    LeadModel.countDocuments({
      ...previousQuery,
      leadStatus: { $in: followupStatusIds }
    }),

    // Imported Leads
    LeadModel.countDocuments({ ...baseQuery, leadAddType: 'Import' }),
    LeadModel.countDocuments({ ...previousQuery, leadAddType: 'Import' }),

    // Outsourced Leads
    LeadModel.countDocuments({ ...baseQuery, leadAddType: 'ThirdParty' }),
    LeadModel.countDocuments({
      ...previousQuery,
      leadAddType: 'ThirdParty'
    })
  ])

  // Calculate percentage changes
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0
    return (((current - previous) / previous) * 100).toFixed(2)
  }

  // Format numbers with K for thousands
  const formatNumber = (num) => {
    return num >= 1000 ? (num / 1000).toFixed(3) + 'K' : num
  }

   
   return data= [{
      value: formatNumber(currentLeads),
      change: calculatePercentageChange(currentLeads, previousLeads),
      title: 'All Leads',
      color: '#2AFF04',
      webroute: 'https://crm.codeconnect.in/leads/all',
      deeplink:'alllead'
    },
     {
      value: formatNumber(followupLeads),
      change: calculatePercentageChange(followupLeads, previousFollowupLeads),
      title: 'All Followup Leads',
      color: '#049bff',
      webroute: 'https://crm.codeconnect.in/leads/followup',
      deeplink:'allFollowupLeads'
    },
     {
      value: formatNumber(importedLeads),
      change: calculatePercentageChange(importedLeads, previousImportedLeads),
      title: 'All Imported Leads',
      color: '#ff8e04',
      webroute: 'https://crm.codeconnect.in/leads/imported-leads',
      deeplink:'allImportedLeads'
    },
     {
      value: formatNumber(outsourcedLeads),
      change: calculatePercentageChange(
        outsourcedLeads,
        previousOutsourcedLeads
      ),
      title: 'All Outsource Leads',
      color: '#0804ff',
      webroute: 'https://crm.codeconnect.in/leads/outsourced-leads',
      deeplink:'allOutsourceLeads'
    } ]
  
}

const activityMetricss =async (start, end, user)=>{
// Get all lead statuses with showDashboard: true
const dashboardStatusList = await LeadStatusModel.find({
    companyId: user.companyId,
    showDashboard: true
  }).lean()

  // For current period (today to next 3 days)
  const currentDate = new Date()
  currentDate.setUTCHours(0, 0, 0, 0)

  const nextThreeDays = new Date(currentDate)
  nextThreeDays.setDate(nextThreeDays.getDate() + 3)
  nextThreeDays.setUTCHours(23, 59, 59, 999)

  // Create aggregation pipeline for each status
  const statusPromises = dashboardStatusList.map(async (status) => {
    const leadCount = await LeadModel.countDocuments({
      companyId: user.companyId,
      leadStatus: status._id,
      followUpDate: { $gte: currentDate, $lte: nextThreeDays }
    })

    return {
      title: status.name,
      color: status.color || '#000000', // Use status color or default to black
      value: leadCount,
      currentDate:currentDate,
      nextDate:nextThreeDays,
      leadStatus: status._id,
      route: `https://crm.codeconnect.in/leadspage`
    }
  })

  const activityMetrics = await Promise.all(statusPromises)
  
  return activityMetrics;

}

// const performanceMetricss=async (start,end, user)=>{
//    return { yearlySales: {
//         value: '3.456K',
//         count: 45,
//         percentage: 75,
//         title: 'Yearly Sales',
//         color: '#24b224'
//       },
//       monthlySales: {
//         value: '3.465',
//         count: 2,
//         percentage: 40,
//         title: 'Monthly Sales',
//         color: '#0461ff'
//       },
//       missOpportunity: {
//         value: '$42.2K',
//         count: 15,
//         percentage: 83.33,
//         title: 'Miss Opportunity',
//         color: '#ff8504'
//       }  }
// }

const performanceMetricss = async (start, end, user) => {
    // First, get lead sources and their counts
    const leadSourceStats = await LeadModel.aggregate([
      {
        $match: {
          companyId: user.companyId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'leadsources',
          localField: 'leadSource',
          foreignField: '_id',
          as: 'sourceInfo'
        }
      },
      {
        $unwind: '$sourceInfo'
      },
      {
        $group: {
          _id: {
            sourceId: '$sourceInfo._id',
            sourceName: '$sourceInfo.name',
            color: '$sourceInfo.color'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id.sourceName',
          color: '$_id.color',
          value: '$count'
        }
      }
    ]);
  
    // Calculate total leads
    const totalLeads = leadSourceStats.reduce((sum, source) => sum + source.value, 0);
  
    return {
      yearlySales: {
        value: '3.456K',
        count: 45,
        percentage: 75,
        title: 'Yearly Sales',
        color: '#24b224'
      },
      monthlySales: {
        value: '3.465',
        count: 2,
        percentage: 40,
        title: 'Monthly Sales',
        color: '#0461ff'
      },
      missOpportunity: {
        value: '$42.2K',
        count: 15,
        percentage: 83.33,
        title: 'Miss Opportunity',
        color: '#ff8504'
      },
      leadSourceOverview: {
        total: totalLeads,
        sources: leadSourceStats.map(source => ({
          name: source.name,
          value: source.value,
          color: source.color || '#000000', // Fallback color if not defined
          percentage: ((source.value / totalLeads) * 100).toFixed(2)
        }))
      }
    };
  };