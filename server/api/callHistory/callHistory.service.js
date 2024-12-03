
const callHistoryModel= require('./callHistory.model')

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