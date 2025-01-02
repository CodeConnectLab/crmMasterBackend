const notificationModel = require('./notificationSetting.model')
const mongoose = require('mongoose')
const Modelnotification=require('./notification.model')
const admin = require('firebase-admin');
const UserModel=require('../user/user.model')

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });


exports.getNotificationList = async ({}, user) => {
  try {
    if (!user?.companyId) {
      throw new Error('Company ID is required')
    }
    return notificationModel
      .find({
        companyId: user.companyId
        //deleted: false
      })
      .populate({
        path: 'statusId',
        select: 'name',
        model: 'LeadStatus'
      })
      .lean()
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.updateNotificationSettings = async (
  notificationId,
  updateData,
  user
) => {
  try {
    if (!user?._id || !user?.companyId) {
      throw new Error('Invalid user data')
    }
    const notificationObjectId = new mongoose.Types.ObjectId(notificationId)
    // Check if notification exists and belongs to the company
    const existingNotification = await notificationModel.findOne({
      _id: notificationObjectId,
      companyId: user.companyId
    })

    if (!existingNotification) {
      throw new Error('Notification settings not found')
    }

    // Create update object with only allowed fields
    const updateFields = {
      ...(typeof updateData.isEnabled !== 'undefined' && {
        isEnabled: updateData.isEnabled
      }),
      ...(typeof updateData.useFollowUpTime !== 'undefined' && {
        useFollowUpTime: updateData.useFollowUpTime
      }),
      ...(updateData.notificationCustomTime && {
        notificationCustomTime: updateData.notificationCustomTime
      }),
      ...(updateData.recipients && {
        recipients: {
          ...(typeof updateData.recipients.admin !== 'undefined' && {
            admin: updateData.recipients.admin
          }),
          ...(typeof updateData.recipients.teamLead !== 'undefined' && {
            teamLead: updateData.recipients.teamLead
          }),
          ...(typeof updateData.recipients.regularUser !== 'undefined' && {
            regularUser: updateData.recipients.regularUser
          })
        }
      }),
      ...(updateData.titleTemplate && {
        titleTemplate: updateData.titleTemplate
      }),
      ...(updateData.time && {
        time: updateData.time
      }),
      ...(updateData.bodyTemplate && {
        bodyTemplate: updateData.bodyTemplate
      })
    }
    // Update notification settings
    const updatedSettings = await notificationModel.findByIdAndUpdate(
      notificationObjectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    return updatedSettings
  } catch (error) {
    return Promise.reject(error)
  }
}


exports.manuallySendNotification = async ({ token, title, message }, user) => {
    console.log("user",user)
  if (!token || !title || !message) {
    return 'Missing required fields';
  }

  // Correct payload structure
  const payload = {
    token: token,  // Token directly at the root level
    notification: {
      title: title,
      body: message,
    },
  };

  try {
    //await admin.messaging().send(payload);
    return 'Notification sent!';
  } catch (error) {
    console.error('Error sending notification:', error);
    console.error('Token causing error:', token);
    return `Error: ${error.message}`;
  }
};




///////  get notification list of user
exports.getNotificationListOfUser = async ({},user) => {
  try {
      return  await Modelnotification.find({ userId: user._id }).sort({ createdAt: -1 });
  } catch (error) {
    return Promise.reject(error)
  }

}


//////////  save notification list of user
exports.saveNotificationListOfUser = async ({ titleTemplate ,bodyTemplate ,userId }, user) => {
  if (!titleTemplate || !bodyTemplate) {
    return 'Missing required fields';
  } 
    const getUser=await UserModel.findOne({_id:userId});
   // console.log("getUser",getUser?.fcmMobileToken)
   
        const notification = Modelnotification.create({titleTemplate,bodyTemplate,userId,companyId:user.companyId});

  try {
    // Correct payload structure
  const payload = {
    token: getUser.fcmMobileToken,  // Token directly at the root level
    notification: {
      title: titleTemplate,
      body: bodyTemplate,
    },
  };
  
    //await admin.messaging().send(payload);
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    console.error('Token causing error:', token);
    return `Error: ${error.message}`;
  }
}

///////// getnotification for mobile and web
exports.getNotification=async({},user)=>{
  try {
    return await Modelnotification.find({ userId: user._id }).sort({ createdAt: -1 });
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.seenUpdate = async ({ notificationIds }, user) => {
  try {
    // Validate input
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      throw new Error("Invalid notificationIds. It should be a non-empty array.");
    }

    // Update the notifications in the database
    const result = await Modelnotification.updateMany(
      { 
        _id: { $in: notificationIds }, // Match notifications by their IDs
        userId: user._id              // Ensure they belong to the logged-in user
      },
      { $set: { seenStatus: true } }  // Update the `seenStatus` to true
    );

    // Return success response
    return {
      message: `${result.modifiedCount} notifications marked as seen`,
    };
  } catch (error) {
    // Return error response
    return Promise.reject(error);
  }
};




