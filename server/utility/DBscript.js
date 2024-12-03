const mailer = require("../mailer"),
	file = require("fs"),
	mongoose = require("mongoose"),
	  moment = require("moment-timezone"),
	axios = require("axios"),
	constants = require("../config/environment/index"),
    userRole = require('../config/environment/index').USER_ROLES;


function mailLogs(log) {
	const mailer = require("../mailer");
	mailer.sendMail({
		templateName: "db-script",
		toEmail: "devteam@yogarise.io",
		locals: {
			env: process.env.NODE_ENV,
			log: log,
		},
	});
}

function readFile(filename) {
	return new Promise((res, rej) => {
		file.readFile(filename, (error, data) => {
			try {
				if (error) throw error;

				return res(JSON.parse(data));
			} catch (error) {
				return rej(error);
			}
		});
	});
}

const print = console.log
// exports.run = (async () => {
// 	try {
// 		const UserModel = require("../api/user/user.model");

// 		let res = await Promise.all([
// 			UserModel.updateMany({
// 				deleted: false
// 			}, {
// 				canRecieveIncidentNotification: true
// 			})
// 		])
// 		mailLogs("Email update physical incident => " + JSON.stringify(res));
// 	} catch (error) {
// 		mailLogs("Email update physical incident error => " + JSON.stringify(error));
// 	}
// })()