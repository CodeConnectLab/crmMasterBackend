
const notificationModel= require('./notificationSetting.model');


exports.getNotificationList = async ({},user) => {
    try {
      if (!user?.companyId) {
        throw new Error('Company ID is required');
      }
      return notificationModel.find({
        companyId: user.companyId,
        //deleted: false
      }).populate({
        path: 'statusId',
        select: 'name',
        model: 'LeadStatus'
      })
      .lean();
  
    } catch (error) {
      return Promise.reject(error);
    }
  };