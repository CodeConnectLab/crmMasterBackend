'use strict';
const express = require('express');
let app = express();
let server = require('http').createServer(app);
var mongoose = require('mongoose');

require('dotenv').config({
	path: __dirname + '/config/.env'
});
/////////// this for notification
const { initializeNotificationScheduler, refreshSchedules } = require('./api/notificationSetting/sendPushNotification');
// Initialize when app starts
 initializeNotificationScheduler();
process.env.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

const config = require('./config/environment');

//make database conection
require('./config/dataSource')(config);

global.responseHandler = require('./config/responseHandler');

require('./config/express')(app);
require('./routes')(app);

server.listen(config.port, config.ip, function () {
    console.log(" server is running on port", config.port);
});

// Expose app
exports = module.exports = app;