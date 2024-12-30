const notificationModel = require('./notificationSetting.model')
const mongoose = require('mongoose')

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


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
    await admin.messaging().send(payload);
    return 'Notification sent!';
  } catch (error) {
    console.error('Error sending notification:', error);
    console.error('Token causing error:', token);
    return `Error: ${error.message}`;
  }
};

