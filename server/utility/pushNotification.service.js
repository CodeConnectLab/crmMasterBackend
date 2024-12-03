// const FCM = require('fcm-push'),
//     fcm = new FCM(process.env.firbase_server_key);
// /**
//  * @description
//  * @param {array} deviceIds : array of deviceids to receive messasges
//  * @param {string} msg : message to be sent to the users
//  */
// exports.sendNotification = ({deviceIds, msg}) => {
//     (async () => {
//         // call user database device id
//         console.log('device  Ids -> ',deviceIds);
//         if(process.env.LOCAL == 'true') {
//           console.log('all local push notification are cancelled!')
//           return;
//         }
//         try {
//               var message = {
//                 registration_ids: deviceIds, //multi cast incident to responsible users
//                 //to: user.deviceID, // required fill with device token or topics
//                 collapse_key: 'your_collapse_key',
//                 data: {
//                   your_custom_data_key: 'your_custom_data_value'
//                 },
//                 notification: {
//                 // title: title,
//                   body: msg
//                 }
//               };
//               fcm.send(message)
//                 .then(function (response) {
//                   console.log("Successfully sent to userID - ")
//                   console.log("response => ",response);
//                 })
//                 .catch(function (err) {
//                   console.log("Something has gone wrong!");
//                   console.log("error => ",err);
//                 })
            
//         } catch (error) {
//           console.log('Error on sending notification',error)
//           return Promise.reject(error);
//         }
//     })();
// }

const axios = require('axios');
// Function to send push notification via MoEngage
const sendPushNotification = async (deviceId, message, platform ) => {
  const url = `https://api-01.moengage.com/v1/send`;

  const headers = {
    'Content-Type': 'application/json',
    'MOE-APPKEY': process.env.MOE_APPKEY, // Ensure you use the correct environment variable names
    'MOE-APPID': process.env.MOE_APPID,
  };

  const notificationData = {
    target_platform: [platform],
    target_audience: {
      filter_type: 'custom',
      custom_segment: {
        filter_criteria: {
          // Define your segment criteria here
          device_id: deviceId
        }
      }
    },
    payload: {
      content: {
        title: 'Notification Title',
        message: message,
        platform_content: {
          android: {
            priority: 'high',
            sound: 'default'
          },
          ios: {
            badge: 1,
            sound: 'default'
          }
        }
      }
    }
  };

  try {
    const response = await axios.post(url, notificationData, { headers });
    console.log('Push Notification Sent:', response.data);
  } catch (error) {
    console.error('Error Sending Push Notification:', error.response ? error.response.data : error.message);
  }
};

module.exports = {
  sendPushNotification
};