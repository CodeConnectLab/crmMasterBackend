// module.exports = {
// 	apps: [
// 		{
// 			name: "app",
// 			script: "./app.js",
// 		},
// 	],
// };

module.exports = {
	apps: [{
	  name: "Backend",
	  script: "./server/app.js",
	  env: {
		NODE_ENV: "production",
		PORT: 9000,
		HOST: "http://13.203.123.47:9000",  // Update with your EC2 IP
		MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://codeconnect123:codeconnect123@cluster0.ocxugzh.mongodb.net/mydatabase1?retryWrites=true&w=majority',
		SESSION_SECRET: process.env.SESSION_SECRET || 'your_jwt_secret',
		REFRESH_SECRET: process.env.REFRESH_SECRET || 'your_refresh_jwt_secret'
	  },
	  error_file: "./logs/err.log",
	  out_file: "./logs/out.log",
	}]
  }
