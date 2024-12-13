
const callHistoryModel = require('./callHistory.model')
const mongoose = require('mongoose');
const { report } = require('./callHistory.route');
const UserModel = require('../user/user.model');
exports.saveCallHistory = async (data, user) => {
    try {
        const callRecords = await Promise.all(
            data.map(async (call) => {
                // Check for existing call record
                const existingCall = await callHistoryModel.findOne({
                    companyId: user.companyId,
                    userId: user._id,
                    phoneNumber: call.phoneNumber,
                    timestamp: new Date(parseInt(call.timestamp)),
                    callType: call.type
                });

                if (existingCall) {
                    return null; // Skip existing calls
                }

                return {
                    companyId: user.companyId,
                    userId: user._id,
                    callerName: call?.name || 'Unknown Number',
                    phoneNumber: call?.phoneNumber,
                    timestamp: new Date(parseInt(call.timestamp)),
                    duration: call?.duration || 0,
                    callType: call?.type,
                    rawType: call?.rawType,
                    dateTime: call?.dateTime
                };
            })
        );

        // Filter out nulls (existing records) and save new records
        const newRecords = callRecords.filter(record => record !== null);

        if (newRecords.length === 0) {
            return { message: 'No new calls to save', savedCount: 0 };
        }

        const savedCalls = await callHistoryModel.insertMany(newRecords, { ordered: false });

        return {
            message: `Successfully saved ${savedCalls.length} call records`,
            savedCount: savedCalls.length,
            savedCalls
        };

    } catch (error) {
        console.error('Error in saveCallHistory:', error);
        return Promise.reject({
            success: false,
            message: error.message || 'Error saving call history',
            error: error
        });
    }
};

// Helper function to parse duration into HH:MM:SS format
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};


exports.callReport = async (data, user) => {
    try {
        const { userId, startDate, endDate } = data;
        /////// first call report get function
        if (userId) {
            let getcallreport1 = await getcallreport(userId, startDate, endDate, user);

            let getcallreportlist1 = await getcallreportlist(startDate, endDate, user);
            return { ...getcallreport1, ...getcallreportlist1 }
        }
        return await getcallreportlist(startDate, endDate, user);
    } catch (error) {
        return Promise.reject({
            success: false,
            message: error.message || 'Error saving call history',
            error: error
        });
    }
};
  
async function getcallreport(userId, startDate, endDate, user) {
    // Convert start date to beginning of day (00:00:00)
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    // Convert end date to end of day (23:59:59.999)
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    // Base query
    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        companyId: user.companyId
    };
    // Add date range if provided
    if (startDate && endDate) {
        query.timestamp = {
            $gte: start,
            $lte: end
        };
    }
    // Get all calls for the period
    const calls = await callHistoryModel.find(query);
    // Calculate summary statistics
    const summary = {
        incoming: calls.filter(call => call.callType === 'INCOMING'),
        outgoing: calls.filter(call => call.callType === 'OUTGOING'),
        missed: calls.filter(call => call.callType === 'MISSED'),
        rejected: calls.filter(call => call.callType === 'REJECTED'),
        unknown: calls.filter(call => call.callType === 'UNKNOWN')
    };
    // Calculate total duration
    const totalDuration = calls.reduce((acc, call) => acc + (call.duration || 0), 0);
    // Find top caller
    const callerCount = {};
    calls.forEach(call => {
        callerCount[call.phoneNumber] = (callerCount[call.phoneNumber] || 0) + 1;
    });
    const topCaller = Object.entries(callerCount)
        .sort(([, a], [, b]) => b - a)[0] || [];
    // Find longest call
    const longestCall = calls.reduce((max, call) =>
        (call.duration > (max?.duration || 0)) ? call : max, null);
    // Calculate average durations
    const connectedCalls = calls.filter(call => call.duration > 0);
    const avgDurationPerCall = connectedCalls.length > 0
        ? connectedCalls.reduce((acc, call) => acc + call.duration, 0) / connectedCalls.length
        : 0;
    //////this is graph api data for mobile 
    const graphdata = [
        { key: 1, value: summary.incoming.length, svg: { fill: '#3498db' }, title: 'Incoming Call' },
        { key: 2, value: summary.outgoing.length, svg: { fill: '#2ecc71' }, title: 'Outgoing Call' },
        { key: 3, value: summary.missed.length, svg: { fill: '#f39c12' }, title: 'Missed Call' },
        { key: 4, value: summary.rejected.length, svg: { fill: '#e74c3c' }, title: 'Rejected Call' },
        { key: 5, value: summary.unknown.length, svg: { fill: '#e74acb' }, title: 'Unknown Call' },
    ];
    return response = {
        summary: {
            callType: [
                {
                    calltype: 'incoming',
                    calls: summary.incoming.length,
                    duration: formatDuration(summary.incoming.reduce((acc, call) => acc + (call.duration || 0), 0))
                },
                {
                    calltype: 'outgoing',
                    calls: summary.outgoing.length,
                    duration: formatDuration(summary.outgoing.reduce((acc, call) => acc + (call.duration || 0), 0))
                },
                {
                    calltype: 'missed',
                    calls: summary.missed.length,
                    duration: formatDuration(summary.missed.reduce((acc, call) => acc + (call.duration || 0), 0))
                },
                {
                    calltype: 'rejected',
                    calls: summary.rejected.length,
                    duration: formatDuration(summary.rejected.reduce((acc, call) => acc + (call.duration || 0), 0))
                },
                {
                    calltype: 'unknown',
                    calls: summary.unknown.length,
                    duration: formatDuration(summary.unknown.reduce((acc, call) => acc + (call.duration || 0), 0))
                },
                {
                    calltype: 'total',
                    calls: calls.length,
                    duration: formatDuration(totalDuration)
                }
            ],
            stats: {
                missCall: summary.missed.length,
                notConnectedCall: summary.missed.length + summary.rejected.length,
                connectedCalls: connectedCalls.length,
                rejected: summary.rejected.length,
                workingHours: formatDuration(totalDuration)
            }
        },
        graphdata,
        analysis: {
            mobileCallAnalysis: {
                topCaller: {
                    number: topCaller[0] || '',
                    totalCalls: topCaller[1] || 0
                }
            },
            totalCallDurationAnalysis: {
                longestDuration: longestCall ? {
                    duration: formatDuration(longestCall.duration),
                    callTo: longestCall.phoneNumber,
                    callTime: longestCall.dateTime
                } : null
            },
            averageCallDurationAnalysis: {
                perCall: formatDuration(Math.floor(avgDurationPerCall)),
                totalCalls: calls.length,
                perDay: formatDuration(Math.floor(totalDuration / (calls.length || 1))),
                totalDays: calls.length ? 1 : 0 // This should be calculated based on date range
            }
        }
    };
}

async function getcallreportlist(startDate, endDate, user) {
    // Convert dates
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Base query for company
    let userQuery = {
        companyId: user.companyId
    };
    // If user is not admin, only show their own data
    if (user.role !== 'Super Admin') {
        userQuery._id = user._id;
    }
    // Get all relevant users
    const users = await UserModel.find(userQuery).select('_id name role email phone');

    // Get call statistics for each user
    const employeeList = await Promise.all(users.map(async (employee, index) => {
        const callQuery = {
            userId: employee._id,
            companyId: user.companyId,
            timestamp: {
                $gte: start,
                $lte: end
            }
        };

        const calls = await callHistoryModel.find(callQuery);

        // Calculate statistics
        const totalCalls = calls.length;
        const totalDuration = calls.reduce((acc, call) => acc + (call.duration || 0), 0);
        const connectedCalls = calls.filter(call => call.duration > 0);
        const avgDuration = connectedCalls.length > 0
            ? connectedCalls.reduce((acc, call) => acc + call.duration, 0) / connectedCalls.length
            : 0;

        return {
            employeeId: 'COM0' + index + 1,
            userId: employee._id,
            user: employee.name,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            highestCalls: totalCalls,
            totalDuration: formatDuration(totalDuration),
            averageCallDuration: formatDuration(Math.floor(avgDuration)),
            callDetails: {
                incoming: calls.filter(call => call.callType === 'INCOMING').length,
                outgoing: calls.filter(call => call.callType === 'OUTGOING').length,
                missed: calls.filter(call => call.callType === 'MISSED').length,
                rejected: calls.filter(call => call.callType === 'REJECTED').length,
                unknown: calls.filter(call => call.callType === 'UNKNOWN').length
            }
        };
    }));

    // Sort by highest calls
    employeeList.sort((a, b) => b.highestCalls - a.highestCalls);

    return {
        employeeList
    };
}



//////////////  get call list 
exports.getCallList = async ({ startDate, endDate, userId }, { page = 1, limit = 10, search }, user) => {
    try {
      // Build base query
      const query = {
        companyId: user.companyId
      };
  
      // Add userId filter if provided or if user is not admin
      if (userId) {
        query.userId = userId;
      } 
   

       // Convert start date to beginning of day (00:00:00)
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    // Convert end date to end of day (23:59:59.999)
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    // Base query
 
    // Add date range if provided
    if (startDate && endDate) {
        query.timestamp = {
            $gte: start,
            $lte: end
        };
    }
  
     
  
      // Add search filter
      if (search) {
        query.$or = [
          { callerName: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') }
        ];
      }
  
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      // Fetch data and count in parallel
      const [calls, total] = await Promise.all([
        callHistoryModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
          callHistoryModel.countDocuments(query)
      ]);
  
      // Format call data
      const formattedCalls = calls.map((call, index) => ({
        clientName: call.callerName || call.phoneNumber,
        mobileNo: call.phoneNumber,
        callDateTime: call.dateTime,
        duration: formatDuration1(call.duration),
        callType: call.callType,
        rawType: call.rawType
      }));
  
      return {
        calls: formattedCalls,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
  
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  // Helper function
  const formatDuration1 = (seconds) => {
    if (!seconds) return '0h 0m 0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

///////////  sela report 

exports.productSaleReport = async (data, user) => {
    const { userId, startDate, endDate, } = data;
    try {

    } catch (error) {

    }
}





