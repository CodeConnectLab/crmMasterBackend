'use strict';
const express = require('express');
let app = express();
let server = require('http').createServer(app);
var mongoose = require('mongoose');
// mongoose.plugin(require('mongoose-paginate'));
// var figlet = require('figlet');


/////////// this for notification
// const { initializeNotificationScheduler, refreshSchedules } = require('../server/api/notificationSetting/sendPushNotification');
// Initialize when app starts
//  initializeNotificationScheduler();
/////////// this for notification

// load all variable from .env file to system enviornment
require('dotenv').config({
	path: __dirname + '/config/.env'
});

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

const config = require('./config/environment');

//make database conection
require('./config/dataSource')(config);

global.responseHandler = require('./config/responseHandler');
global.logger = require('./config/logger')(app, config);

require('./config/express')(app);
require('./routes')(app);
require('./config/errorHandling')(app, config);

// Start server
server.listen(config.port, config.ip, function () {
	logger.info('Express server listening on %d, in %s mode', config.port, app.get('env'));
	// figlet(config.projectName, {
	// 	font: 'colossal'
	// },
	// 	function (err, data) {
	// 		if (err) {
	// 			console.log('Something went wrong...');
	// 			console.dir(err);
	// 			return;
	// 		}
	// 		console.log("\n" + data + "\n")
			console.log(" *****listening", config.port + " port On", app.get('env') + " Environment *****");
		// });
});

// Expose app
exports = module.exports = app;