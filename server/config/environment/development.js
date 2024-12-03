"use strict";

// Development specific configuration
// ==================================
module.exports = {
	// for PROD env
	production: false,
	logOnScreen: true,
	// MongoDB connection options
	mongo: {
		uri: process.env.MONGO_URI || "mongodb://localhost/nyc",
	},
};