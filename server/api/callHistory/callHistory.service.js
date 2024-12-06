
const callHistoryModel= require('./callHistory.model')
const mongoose = require('mongoose')
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

exports.callReport = async (data,user) => {
    try {
        const { userId, startDate, endDate } = data;
        // Base query
        const query = {
            userId: new mongoose.Types.ObjectId(userId),
            companyId: user.companyId
        };

        // Convert start date to beginning of day (00:00:00)
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);

        // Convert end date to end of day (23:59:59.999)
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

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

        return response = {
            summary: {
                callType: {
                    incoming: {
                        calls: summary.incoming.length,
                        duration: formatDuration(summary.incoming.reduce((acc, call) => acc + (call.duration || 0), 0))
                    },
                    outgoing: {
                        calls: summary.outgoing.length,
                        duration: formatDuration(summary.outgoing.reduce((acc, call) => acc + (call.duration || 0), 0))
                    },
                    missed: {
                        calls: summary.missed.length,
                        duration: formatDuration(summary.missed.reduce((acc, call) => acc + (call.duration || 0), 0))
                    },
                    rejected: {
                        calls: summary.rejected.length,
                        duration: formatDuration(summary.rejected.reduce((acc, call) => acc + (call.duration || 0), 0))
                    },
                    unknown: {
                      calls: summary.unknown.length,
                      duration: formatDuration(summary.unknown.reduce((acc, call) => acc + (call.duration || 0), 0))
                  },
                    total: {
                        calls: calls.length,
                        duration: formatDuration(totalDuration)
                    }
                },
                stats: {
                    missCall: summary.missed.length,
                    notConnectedCall: summary.missed.length + summary.rejected.length,
                    connectedCalls: connectedCalls.length,
                    rejected: summary.rejected.length,
                    workingHours: formatDuration(totalDuration)
                }
            },
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

        

    } catch (error) { 
      return Promise.reject({
        success: false,
        message: error.message || 'Error saving call history',
        error: error
      });
    }
};




