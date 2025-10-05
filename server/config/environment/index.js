'use strict';

const path = require('path');

function requiredProcessEnv(name) {
	if (!process.env[name]) {
		throw new Error('You must set the ' + name + ' environment variable');
	}
	return process.env[name];
}

// All configurations will extend these options
// ============================================
let all = {
	projectName: "CRM",
	websiteName: "CRM",

	env: process.env.NODE_ENV,

	// Root path of server
	root: path.normalize(__dirname + "/../../.."),

	// Server port
	port: process.env.PORT || 7000,

	// Server IP
	ip: process.env.IP || "0.0.0.0",

	// Should we populate the DB with sample data?
	seedDB: process.env.SEED || false,

	// Should we print logs on Screen?
	logOnScreen: false,

	// Secret for session, you will want to change this and make it an environment variable
	secrets: {
		session: process.env.SESSION_SECRET || "secret",
	},

	// url for static assets,
	url: {
		static: "api/static/",
	},

	exceptionEmailID: '',

	// MongoDB connection options
	mongo: {
		options: {
			db: {
				safe: true,
			},
		},
	},
};

// Export the config object based on the NODE_ENV
// ==============================================
const env = require('./' + (process.env.NODE_ENV || "development") + '.js') || {}
module.exports = {
    ...all,
    ...env
}