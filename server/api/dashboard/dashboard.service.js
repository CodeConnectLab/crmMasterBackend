const LeadModel=require('../lead/lead.model');
const LeadStatusModel=require('../leadStatus/leadStatus.model')
const userRoles = require('../../config/constants/userRoles');
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
      
      const performanceMetrics= await calculateSalesMetrics(user)

      const leadSourceMetricss=await leadSourceMetricsss(start,end,user)

      const paymentOverview=await getPaymentsOverview(user)
      

      return {
        topMetrics,
        activityMetrics,
        performanceMetrics,
        leadSourceMetricss,
        paymentOverview
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
   // Add user filter if not Super Admin
   if (user.role !== userRoles.SUPER_ADMIN) {
    baseQuery.assignedAgent = user._id;
    previousQuery.assignedAgent = user._id;
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

const activityMetricss = async (start, end, user) => {
  // Get all lead statuses with showDashboard: true
  const dashboardStatusList = await LeadStatusModel.find({
    companyId: user.companyId,
    showDashboard: true
  }).lean();

  // Set up dates
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);
  
  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setUTCHours(23, 59, 59, 999);

  // Create base query based on user role
  const baseQuery = {
    companyId: user.companyId
  };

  // Add user filter if not Super Admin
  if (user.role !== userRoles.SUPER_ADMIN) {
    baseQuery.assignedAgent = user._id;
  }

  // Create aggregation pipeline for each status
  const statusPromises = dashboardStatusList.map(async (status) => {
    // Count for today
    const todayCount = await LeadModel.countDocuments({
      ...baseQuery,
      leadStatus: status._id,
      followUpDate: { $gte: today, $lte: endOfToday }
    });

    // Count for tomorrow
    const tomorrowCount = await LeadModel.countDocuments({
      ...baseQuery,
      leadStatus: status._id,
      followUpDate: { $gte: tomorrow, $lte: endOfTomorrow }
    });

    return {
      title: status.name,
      color: status.color || '#000000',
      today: todayCount,
      tomorrow: tomorrowCount,
      leadStatus: status._id,
      route: 'https://crm.codeconnect.in/leadspage'
    };
  });

  const activityMetrics = await Promise.all(statusPromises);
  return activityMetrics;
};

const calculateSalesMetrics = async (user) => {
  try {
    // Get current date info with UTC consideration
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Set date ranges with UTC
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    // Base query with company filter
    const baseQuery = { companyId: user.companyId };
    if (user.role !== userRoles.SUPER_ADMIN) {
      baseQuery.userId = user._id;
    }

    // Fetch status IDs in parallel
    const [wonStatusIds, lossStatusIds] = await Promise.all([
      LeadStatusModel.find({ 
        companyId: user.companyId, 
        wonStatus: true 
      }).distinct('_id'),
      LeadStatusModel.find({ 
        companyId: user.companyId, 
        lossStatus: true 
      }).distinct('_id')
    ]);

    // Run all aggregations in parallel for better performance
    const [yearlyWonResult, monthlyWonResult, monthlyLostResult, previousYearResult] = await Promise.all([
      // Yearly won amount (current year)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly won amount (current month)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly lost amount (current month)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: lossStatusIds },
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadCost', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Previous year's data for percentage calculation
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: {
              $gte: new Date(Date.UTC(currentYear - 1, 0, 1)),
              $lte: new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999))
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } }
          }
        }
      ])
    ]);

    // Calculate percentages based on previous year's data
    const previousYearAmount = previousYearResult[0]?.totalAmount || 0;
    const currentYearAmount = yearlyWonResult[0]?.totalAmount || 0;
    const yearlyPercentage = previousYearAmount ? 
      Math.min(Math.round((currentYearAmount / previousYearAmount) * 100), 100) : 0;

    // Calculate monthly percentage based on yearly average target
    const monthlyTarget = currentYearAmount ? Math.round(currentYearAmount / 12) : 100000;
    const monthlyPercentage = monthlyTarget ? 
      Math.min(Math.round(((monthlyWonResult[0]?.totalAmount || 0) / monthlyTarget) * 100), 100) : 0;

    // Calculate miss opportunity percentage
    const totalOpportunities = (monthlyWonResult[0]?.count || 0) + (monthlyLostResult[0]?.count || 0);
    const missPercentage = totalOpportunities ? 
      Math.round(((monthlyLostResult[0]?.count || 0) / totalOpportunities) * 100) : 0;

    return {
      yearlySales: {
        amount: yearlyWonResult[0]?.totalAmount || 0,
        count: yearlyWonResult[0]?.count || 0,
        title: 'Yearly Sales',
        color: '#24b224',
        percentage: yearlyPercentage,
        currency: '₹'
      },
      monthlySales: {
        amount: monthlyWonResult[0]?.totalAmount || 0,
        count: monthlyWonResult[0]?.count || 0,
        title: 'Monthly Sales',
        color: '#0461ff',
        percentage: monthlyPercentage,
        currency: '₹'
      },
      missOpportunity: {
        amount: monthlyLostResult[0]?.totalAmount || 0,
        count: monthlyLostResult[0]?.count || 0,
        title: 'Miss Opportunity',
        color: '#ff8504',
        percentage: missPercentage,
        currency: '₹'
      }
    };
  } catch (error) {
    console.error('Error calculating sales metrics:', error);
    throw new Error('Failed to calculate sales metrics');
  }
};

const leadSourceMetricsss = async (start, end, user) => {
  
    const leadSourceStats = await LeadModel.aggregate([
      {
        $match: {
          companyId: user.companyId,
         /// createdAt: { $gte: start, $lte: end }
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
      {  ////for group for setup value         
        $group: {
          _id: {
            sourceId: '$sourceInfo._id',
            sourceName: '$sourceInfo.name',
            color: '$sourceInfo.color'
          },
          count: { $sum: 1 }
        }
      },
      {  ////for showup
        $project: {
          _id: 0,
          name: '$_id.sourceName',
          color: '$_id.color',
          value: '$count'
        }
      }
    ]);
    const totalLeads = leadSourceStats.reduce((sum, source) => sum + source.value, 0);
  
    return {
     
    
        total: totalLeads,
        sources: leadSourceStats.map(source => ({
          name: source.name,
          value: source.value,
          color: source.color || '#000000', // Fallback color if not defined
          percentage: ((source.value / totalLeads) * 100).toFixed(2)
        }))
    
    };
  };

  const getPaymentsOverview = async (user) => {
    try {
      // Get current date info
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
  
      // Get won and loss status IDs
      const [wonStatusIds, lossStatusIds] = await Promise.all([
        LeadStatusModel.find({
          companyId: user.companyId,
          wonStatus: true
        }).distinct('_id'),
        LeadStatusModel.find({
          companyId: user.companyId,
          lossStatus: true
        }).distinct('_id')
      ]);
  
   
  
      // Generate last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
  
        months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          startDate: startOfMonth,
          endDate: endOfMonth
        });
      }
  
      // Base query for filtering by company and user role
      const baseQuery = { companyId: user.companyId };
      if (user.role !== userRoles.SUPER_ADMIN) {
        baseQuery.userId = user._id;
      }
  
      // Aggregate data for each month
      const monthlyData = await Promise.all(
        months.map(async ({ month, startDate, endDate }) => {
          // Query for won and lost leads in parallel
          const [wonLeads, lostLeads] = await Promise.all([
            // Get won leads
            LeadModel.aggregate([
              {
                $match: {
                  ...baseQuery,
                  leadStatus: { $in: wonStatusIds },
                  updatedAt: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
                  count: { $sum: 1 }
                }
              }
            ]),
  
            // Get lost leads
            LeadModel.aggregate([
              {
                $match: {
                  ...baseQuery,
                  leadStatus: { $in: lossStatusIds },
                  updatedAt: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ['$leadCost', 0] } },
                  count: { $sum: 1 }
                }
              }
            ])
          ]);
  
          return {
            month,
            received: wonLeads[0]?.count || 0,
            loss: lostLeads[0]?.count || 0,
            receivedAmount: wonLeads[0]?.total || 0,
            lossAmount: lostLeads[0]?.total || 0,
          };
        })
      );
  
      // Calculate totals
      const totals = monthlyData.reduce(
        (acc, curr) => {
          acc.totalReceived += curr.receivedAmount;
          acc.totalLoss += curr.lossAmount;
          return acc;
        },
        { totalReceived: 0, totalLoss: 0 }
      );
  
      // Get current month data for percentage calculations
      const currentMonthData = monthlyData[monthlyData.length - 1];
      const previousMonthData = monthlyData[monthlyData.length - 2] || { received: 0, loss: 0 };
  
      // Calculate percentage changes
      const receivedPercentChange = previousMonthData.received ? 
        ((currentMonthData.received - previousMonthData.received) / previousMonthData.received) * 100 : 0;
      const lossPercentChange = previousMonthData.loss ? 
        ((currentMonthData.loss - previousMonthData.loss) / previousMonthData.loss) * 100 : 0;
  
      return {
        chartData: monthlyData,
        summary: {
          receivedLeads: totals.totalReceived,
          lostLeads: totals.totalLoss,
          
        }
      };
  
    } catch (error) {
      console.error('Error in getPaymentsOverview:', error);
      throw new Error('Failed to fetch overview data');
    }
  };