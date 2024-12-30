// const NotificationModel = require('./notificationSetting.model');
// const admin = require('firebase-admin');
// const LeadModel = require('../lead/lead.model');
// const UserModel = require('../user/user.model');
// const moment = require('moment');
// const cron = require('node-cron');

// // Initialize Firebase Admin
// const serviceAccount = require('./serviceAccountKey.json');

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// let scheduledTasks = new Map();

// async function initializeNotificationScheduler() {
//   try {
//     // Clear existing schedules
//     for (let task of scheduledTasks.values()) {
//       task.stop();
//     }
//     scheduledTasks.clear();

//     // Get all active notifications
//     const activeNotifications = await NotificationModel.find({ isEnabled: true });

//     for (const notification of activeNotifications) {
//       // Handle custom time notifications
//       if (notification.notificationCustomTime?.length > 0) {
//         notification.notificationCustomTime.forEach(customTime => {
//           if (customTime.isEnabled) {
//             // Convert time like "10:00" to cron format
//             const [hours, minutes] = customTime.time.split(':');
//             const cronExpression = `${minutes} ${hours} * * *`;

//             // Create unique identifier for this schedule
//             const taskId = `${notification._id}_${customTime._id}`;

//             // Create and store the cron task
//             const task = cron.schedule(cronExpression, async () => {
//               console.log(`Running scheduled notification at ${customTime.time}`);
//               await processNotification(notification);
//             });

//             scheduledTasks.set(taskId, task);
//             console.log(`Scheduled notification for ${customTime.time}`);
//           }
//         });
//       }

//       // Handle follow-up time based notifications
//       if (notification.useFollowUpTime && notification.time) {
//         // Create a task that checks follow-up times every minute
//         const taskId = `followup_${notification._id}`;
//         const task = cron.schedule('* * * * *', async () => {
//           await processFollowUpNotification(notification);
//         });

//         scheduledTasks.set(taskId, task);
//         console.log(`Scheduled follow-up notification for ${notification.time} minutes before follow-up`);
//       }
//     }
//   } catch (error) {
//     console.error('Error initializing notification scheduler:', error);
//   }
// }

// async function processNotification(notification) {
//   try {
//     // Get leads for the company with matching status
//     const leads = await LeadModel.find({
//      // companyId: notification.companyId,
//       statusId: notification.statusId
//     });

//     // Get users based on recipient types
//     const userQuery = { companyId: notification.companyId };
    
//     if (notification.recipients) {
//       const roles = [];
//       if (notification.recipients.admin) roles.push('Super Admin');
//       if (notification.recipients.teamLead) roles.push('Team Leader');
//       if (notification.recipients.regularUser) roles.push('Employee');
      
//       if (roles.length > 0) {
//         userQuery.role = { $in: roles };
//       }
//     }

//     const users = await UserModel.find(userQuery);

//     // Send notifications
//     for (const lead of leads) {
//       for (const user of users) {
//         if (!user.fcmWebToken) continue;

//         // const title = notification.titleTemplate.replace('{title}', lead.title || 'Lead');
//         // const body = notification.bodyTemplate
//         //   .replace('{title}', lead.title || 'Lead')
//         //   .replace('{time}', moment(lead.followUpTime).format('hh:mm A'));

//         const message = {
//           notification: {
//             title:'sent notification',
//             body:'sent notification',
//           },
//           data: {
//             leadId: lead._id.toString(),
//             statusId: notification.statusId.toString(),
//             companyId: notification.companyId.toString(),
//             type: 'LEAD_FOLLOWUP'
//           },
//           token: user.fcmWebToken
//         };

//         try {
//           const response = await admin.messaging().send(message);
//           console.log('Successfully sent notification:', response);
//         } catch (error) {
//           console.error('Error sending notification:', error);
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error processing notification:', error);
//   }
// }

// async function processFollowUpNotification(notification) {
//   try {
//     const currentTime = moment();
//     const leads = await LeadModel.find({
//      // companyId: notification.companyId,
//       statusId: notification.statusId,
//     //   followUpTime: { $exists: true }
//     });

//     console.log("leads",leads)

//     for (const lead of leads) {
//       const followUpTime = moment(lead.followUpDate);
//       const diffInMinutes = followUpTime.diff(currentTime, 'minutes');
      
//       if (diffInMinutes === notification.time) {
//         // Process notification for this lead
//         await processNotification(notification);
//       }
//     }
//   } catch (error) {
//     console.error('Error processing follow-up notification:', error);
//   }
// }

// // Function to refresh schedules (call this when notifications are updated)
// async function refreshSchedules() {
//   await initializeNotificationScheduler();
// }

// module.exports = {
//   initializeNotificationScheduler,
//   refreshSchedules
// };