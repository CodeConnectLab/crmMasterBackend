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

// // async function initializeNotificationScheduler() {
// //   try {
// //     // Clear existing schedules
// //     for (let task of scheduledTasks.values()) {
// //       task.stop();
// //     }
// //     scheduledTasks.clear();

// //     // Get all active notifications
// //     const activeNotifications = await NotificationModel.find({ isEnabled: true });

// //     for (const notification of activeNotifications) {
// //       // Handle custom time notifications
// //       // if (notification.notificationCustomTime?.length > 0) {
// //       //   notification.notificationCustomTime.forEach(customTime => {
// //       //     if (customTime.isEnabled) {
// //       //       // Convert time like "10:00" to cron format
// //       //       const [hours, minutes] = customTime.time.split(':');
// //       //       const cronExpression = `${minutes} ${hours} * * *`;

// //       //       // Create unique identifier for this schedule
// //       //       const taskId = `${notification._id}_${customTime._id}`;

// //       //       // Create and store the cron task
// //       //       const task = cron.schedule(cronExpression, async () => {
// //       //         console.log(`Running scheduled notification at ${customTime.time}`);
// //       //         await processNotification(notification);
// //       //       });

// //       //       scheduledTasks.set(taskId, task);
// //       //       console.log(`Scheduled notification for ${customTime.time}`);
// //       //     }
// //       //   });
// //       // }
// //     pahle hm useFollowUpTime  time true hai to isi pe kam krte hai bad me customTime pe karenge 

// //     ab hmko yha krna ye hai ki ye notification me jo status id hai wo sare lead me se leadstatus id match karwa ke un sb ke lead ke folloupDate nikal ke usne itna  
// //     notification.time  pahle usme assignAgentId Ke user ko and uske  admin and tl ko notification bhejna hai agr dono true hai to 

// //       // Handle follow-up time based notifications
// //       if (notification.useFollowUpTime && notification.time) {
// //         // Create a task that checks follow-up times every minute
// //         const taskId = `followup_${notification._id}`;
// //         const task = cron.schedule('* * * * *', async () => {
// //           await processFollowUpNotification(notification);
// //         });

// //         scheduledTasks.set(taskId, task);
// //         console.log(`Scheduled follow-up notification for ${notification.time} minutes before follow-up`);
// //       }
// //     }
// //   } catch (error) {
// //     console.error('Error initializing notification scheduler:', error);
// //   }
// // }

// // async function processNotification(notification) {
// //   try {
// //     // Get leads for the company with matching status
// //     const leads = await LeadModel.find({
// //      // companyId: notification.companyId,
// //       statusId: notification.statusId
// //     });

// //     // Get users based on recipient types
// //     const userQuery = { companyId: notification.companyId };
    
// //     if (notification.recipients) {
// //       const roles = [];
// //       if (notification.recipients.admin) roles.push('Super Admin');
// //       if (notification.recipients.teamLead) roles.push('Team Leader');
// //       if (notification.recipients.regularUser) roles.push('Employee');
      
// //       if (roles.length > 0) {
// //         userQuery.role = { $in: roles };
// //       }
// //     }

// //     const users = await UserModel.find(userQuery);

// //     // Send notifications
// //     for (const lead of leads) {
// //       for (const user of users) {
// //         if (!user.fcmMobileToken) continue;

// //         // const title = notification.titleTemplate.replace('{title}', lead.title || 'Lead');
// //         // const body = notification.bodyTemplate
// //         //   .replace('{title}', lead.title || 'Lead')
// //         //   .replace('{time}', moment(lead.followUpTime).format('hh:mm A'));

// //         const message = {
// //           notification: {
// //             title:'sent notification',
// //             body:'sent notification',
// //           },
// //           data: {
// //             leadId: lead._id.toString(),
// //             statusId: notification.statusId.toString(),
// //             companyId: notification.companyId.toString(),
// //             type: 'LEAD_FOLLOWUP'
// //           },
// //           token: user.fcmMobileToken
// //         };

// //         try {
// //           const response = await admin.messaging().send(message);
// //           console.log('Successfully sent notification:', response);
// //         } catch (error) {
// //           console.error('Error sending notification:', error);
// //         }
// //       }
// //     }
// //   } catch (error) {
// //     console.error('Error processing notification:', error);
// //   }
// // }




// // async function processFollowUpNotification(notification) {
// //   try {
// //     const currentTime = moment();
// //     const leads = await LeadModel.find({
// //      // companyId: notification.companyId,
// //       statusId: notification.statusId,
// //     //   followUpTime: { $exists: true }
// //     });

// //     ///console.log("leads",leads)

// //     for (const lead of leads) {
// //       const followUpTime = moment(lead.followUpDate);
// //       const diffInMinutes = followUpTime.diff(currentTime, 'minutes');
      
// //       if (diffInMinutes === notification.time) {
// //         // Process notification for this lead
// //         await processNotification(notification);
// //       }
// //     }
// //   } catch (error) {
// //     console.error('Error processing follow-up notification:', error);
// //   }
// // }

// // // Function to refresh schedules (call this when notifications are updated)
// // async function refreshSchedules() {
// //   await initializeNotificationScheduler();
// // }

// // module.exports = {
// //   initializeNotificationScheduler,
// //   refreshSchedules
// // };


// async function processFollowUpNotification(notification) {
//   try {
//     const currentTime = moment();

//     // Find leads matching the notification's status and having followUpDate
//     const leads = await LeadModel.find({
//       leadStatus: notification.statusId,
//       followUpDate: { 
//         $exists: true,
//         $gt: currentTime.toDate() // Only get dates greater than current time
//       }
//      // assignedAgent: { $exists: true }  // Only leads with assigned agents
//     }).populate('assignedAgent'); // Populate assigned agent details

//     console.log(`Found ${leads.length} leads for status ${notification.statusId}`);

//     for (const lead of leads) {

//       const followUpTime = moment(lead.followUpDate);
//       const diffInMinutes = followUpTime.diff(currentTime, 'minutes');
//       console.log('diffInMinutes',diffInMinutes,followUpTime)
//       // Check if it's time to send notification
//       if (diffInMinutes === notification.time) {
//         await sendNotificationsForLead(notification, lead);
//       }
//     }
//   } catch (error) {
//     console.error('Error processing follow-up notification:', error);
//   }
// }

// async function sendNotificationsForLead(notification, lead) {
//   try {
//     // Get recipient users based on settings
//     const users = await getRecipientUsers(notification, lead);
//      console.log(`Found ${users.length} recipients for lead ${lead._id}`);

//     // Send notifications to each user
//     for (const user of users) {
//       if (!user.fcmMobileToken) continue;

//       await sendNotificationToUser(notification, lead, user);
//     }
//   } catch (error) {
//     console.error(`Error sending notifications for lead ${lead._id}:`, error);
//   }
// }

// async function getRecipientUsers(notification, lead) {
//   try {
//     // Start with assigned agent
//     let userQueries = [{ _id: lead.assignedAgent._id }];

//     // Add admin and team lead queries based on notification settings
//     // if (notification.recipients) {
//     //   if (notification.recipients.admin) {
//     //     userQueries.push({ role: 'Super Admin' });
//     //   }
//     //   if (notification.recipients.teamLead) {
//     //     userQueries.push({ role: 'Team Leader' });
//     //   }
//     //   userQueries.push({ role: '' });
//     // }

//     // Find all matching users with FCM tokens
//     const users = await UserModel.find({
//       $or: userQueries,
//       companyId: notification.companyId,
//       fcmMobileToken: { $exists: true, $ne: null }
//     });

//     return users;
//   } catch (error) {
//     console.error('Error getting recipient users:', error);
//     return [];
//   }
// }

// async function sendNotificationToUser(notification, lead, user) {
//   try {
//     const followUpTime = moment(lead.followUpDate).format('hh:mm A');
    
//     // Replace placeholders in templates
//     const title = notification.titleTemplate
//       .replace('{title}', lead.firstName || 'Lead');
      
//     const body = notification.bodyTemplate
//       .replace('{title}', lead.firstName || 'Lead')
//       .replace('{time}', followUpTime);

//     const message = {
//       notification: {
//         title,
//         body,
//       },
//       data: {
//         leadId: lead._id.toString(),
//         statusId: notification.statusId.toString(),
//         companyId: notification.companyId.toString(),
//         type: 'LEAD_FOLLOWUP'
//       },
//       token: user.fcmMobileToken
//     };

//     const response = await admin.messaging().send(message);
//     console.log(`Successfully sent notification to user ${user._id}:`, response);
//   } catch (error) {
//     console.error(`Error sending notification to user ${user._id}:`, error);
//   }
// }

// async function initializeNotificationScheduler() {
//   try {
//     // Clear existing schedules
//     for (let task of scheduledTasks.values()) {
//       task.stop();
//     }
//     scheduledTasks.clear();

//     // Get all active notifications
//     const activeNotifications = await NotificationModel.find({ isEnabled: true });
//     console.log(`Found ${activeNotifications.length} active notifications`);

//     for (const notification of activeNotifications) {
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

// module.exports = {
//   initializeNotificationScheduler,
//   refreshSchedules: initializeNotificationScheduler
// };