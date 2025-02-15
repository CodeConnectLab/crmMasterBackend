const NotificationModel = require('./notificationSetting.model');
const admin = require('firebase-admin');
const LeadModel = require('../lead/lead.model');
const UserModel = require('../user/user.model');
const moment = require('moment');
 const cron = require('node-cron');
 const Modelnotification=require('./notification.model')
// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

let scheduledTasks = new Map();



async function processFollowUpNotification(notification) {
  try {
    const currentTime = moment();

    // Find leads matching the notification's status and having followUpDate
    const leads = await LeadModel.find({
      leadStatus: notification.statusId,
      followUpDate: { 
        $exists: true,
        $gte: currentTime.toDate() // Only get dates greater than current time
      }
     // assignedAgent: { $exists: true }  // Only leads with assigned agents
    }).populate('assignedAgent'); // Populate assigned agent details

    //console.log(`Found ${leads.length} leads for status ${notification.statusId}`);

    for (const lead of leads) {

      const followUpTime = moment(lead.followUpDate);
      const diffInMinutes = followUpTime.diff(currentTime, 'minutes');
      //console.log('diffInMinutes',notification.time,diffInMinutes,followUpTime)
      // Check if it's time to send notification
      // if (diffInMinutes === notification.time || diffInMinutes<notification.time || diffInMinutes==0) {
      //   await sendNotificationsForLead(notification, lead);
      // }
      if (diffInMinutes === notification.time || diffInMinutes==0) {
        await sendNotificationsForLead(notification, lead);
      }
    }
  } catch (error) {
    console.error('Error processing follow-up notification:', error);
  }
}

async function sendNotificationsForLead(notification, lead) {
  try {
    // Get recipient users based on settings
    const users = await getRecipientUsers(notification, lead);
     //console.log(`Found ${users.length} recipients for lead ${lead._id}`);

    // Send notifications to each user
    for (const user of users) {
      // if (!user.fcmMobileToken) continue;
      if (!user?.fcmMobileToken && !user?.fcmWebToken) continue;
      await sendNotificationToUser(notification, lead, user);
    }
  } catch (error) {
    console.error(`Error sending notifications for lead ${lead._id}:`, error);
  }
}

async function getRecipientUsers(notification, lead) {
  try {
    // Start with assigned agent
    let userQueries = [{ _id: lead.assignedAgent._id }];

    // Add admin and team lead queries based on notification settings
    // if (notification.recipients) {
    //   if (notification.recipients.admin) {
    //     userQueries.push({ role: 'Super Admin' });
    //   }
    //   if (notification.recipients.teamLead) {
    //     userQueries.push({ role: 'Team Leader' });
    //   }
    //   userQueries.push({ role: '' });
    // }

    // Find all matching users with FCM tokens
    const users = await UserModel.find({
      $or: userQueries,
      companyId: notification.companyId,
      fcmMobileToken: { $exists: true, $ne: null }
    });

    return users;
  } catch (error) {
    console.error('Error getting recipient users:', error);
    return [];
  }
}

async function sendNotificationToUser_old_not_in_use(notification, lead, user) {
  try {
    const followUpTime = moment(lead.followUpDate).format('hh:mm A');
    
    // Replace placeholders in templates
    const title = notification.titleTemplate
      .replace('{title}', lead.firstName || 'Lead');
      
    const body = notification.bodyTemplate
      .replace('{title}', lead.firstName || 'Lead')
      .replace('{time}', followUpTime);

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        leadId: lead._id.toString(),
        statusId: notification.statusId.toString(),
        companyId: notification.companyId.toString(),
        type: 'LEAD_FOLLOWUP'
      },
      token: user.fcmMobileToken
    };

    const response = await admin.messaging().send(message);
    await Modelnotification.create({titleTemplate:title,bodyTemplate:body,userId:user?._id,companyId:notification.companyId});

    console.log(`Successfully sent notification to user ${user._id}:`, response);
  } catch (error) {
    console.error(`Error sending notification to user ${user._id}:`, error);
  }
}
const moment1=require('moment-timezone')
async function sendNotificationToUser(notification, lead, user) {
  try {
    const userTimeZone = user?.timeZone || 'Asia/Kolkata'; // Default to 'Asia/Kolkata' if timezone is not provided
    
const followUpTime = moment1(lead.followUpDate)
  .tz(userTimeZone) // Convert to user's timezone
  .format('hh:mm A'); // Format time

    // const followUpTime = moment(lead.followUpDate).format('hh:mm A');
    // Replace placeholders in templates
    const title = notification.titleTemplate.replace('{title}', lead.firstName || 'Lead');
    const body = notification.bodyTemplate
      .replace('{title}', lead.firstName || 'Lead')
      .replace('{time}', followUpTime);

    const messagePayload = {
      notification: { title, body },
      data: {
        leadId: lead._id.toString(),
        statusId: notification.statusId.toString(),
        companyId: notification.companyId.toString(),
        type: 'LEAD_FOLLOWUP',
      },
    };

    const sendPromises = [];

    // Send notification to Mobile if token exists
    if (user?.fcmMobileToken) {
      sendPromises.push(
        admin.messaging().send({ ...messagePayload, token: user.fcmMobileToken })
          .then(() => console.log(`Mobile notification sent to ${user._id}`))
          .catch(error => console.error(`Mobile notification failed for ${user._id}:`, error))
      );
    }

    // Send notification to Web if token exists
    if (user?.fcmWebToken) {
      sendPromises.push(
        admin.messaging().send({ ...messagePayload, token: user.fcmWebToken })
          .then(() => console.log(`Web notification sent to ${user._id}`))
          .catch(error => console.error(`Web notification failed for ${user._id}:`, error))
      );
    }

    await Promise.all(sendPromises);

    // Store notification in DB
    await Modelnotification.create({
      titleTemplate: title,
      bodyTemplate: body,
      userId: user?._id,
      companyId: notification.companyId,
    });

  } catch (error) {
    console.error(`Error sending notification to user ${user._id}:`, error);
  }
}

async function initializeNotificationScheduler() {
  try {
    // Clear existing schedules
    for (let task of scheduledTasks.values()) {
      task.stop();
    }
    scheduledTasks.clear();

    // Get all active notifications
    const activeNotifications = await NotificationModel.find({ isEnabled: true });
    //console.log(`Found ${activeNotifications.length} active notifications`);

    for (const notification of activeNotifications) {
      // Handle follow-up time based notifications
      if (notification.useFollowUpTime && notification.time) {
        // Create a task that checks follow-up times every minute
        const taskId = `followup_${notification._id}`;
        const task = cron.schedule('* * * * *', async () => {
          await processFollowUpNotification(notification);
        });

        scheduledTasks.set(taskId, task);
        //console.log(`Scheduled follow-up notification for ${notification.time} minutes before follow-up`);
      }
    }
  } catch (error) {
    console.error('Error initializing notification scheduler:', error);
  }
}

module.exports = {
  initializeNotificationScheduler,
  refreshSchedules: initializeNotificationScheduler
};


// Helper function to calculate the date 1 week ago
const getOneWeekAgoDate = () => {
  const now = new Date();
  now.setDate(now.getDate() - 4);
  return now;
};
// Schedule the job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const oneWeekAgo = getOneWeekAgoDate();

    const result = await Modelnotification.deleteMany({
      seenStatus: true,
      createdAt: { $lte: oneWeekAgo },
    });

    console.log(`Cron Job: Deleted ${result.deletedCount} old seen notifications.`);
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
});