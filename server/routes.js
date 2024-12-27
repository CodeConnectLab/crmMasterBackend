/**
 * Main application routes
 */

'use strict';
const auth = require('./api/auth/auth.service')

module.exports = function (app) {
  // Insert routes below
  app.use('/api', require('./api/user/user.route'));
  app.use("/api", require("./api/auth/auth.route"));
  app.use("/api", require("./api/callHistory/callHistory.route"));
  app.use("/api", require("./api/productService/productService.route"));
  app.use("/api", require("./api/leadSources/leadSources.route"));
  app.use("/api", require("./api/lostReason/lostReason.route"));
  app.use("/api", require("./api/leadStatus/leadStatus.route"));
  app.use("/api", require("./api/locations/locations.route"));
  app.use("/api", require("./api/lead/lead.route"));
  app.use("/api", require("./api/dashboard/dashboard.route"));
  app.use("/api", require("./api/thirdParty/thirdParty.route"));
  app.use("/api", require("./api/geoLocation/geoLocation.route"));
  app.use("/api", require("./api/notificationSetting/notificationSetting.route"));
  // app.use("/api", require("./api/userActivity/userActivity.route"));
  // app.use("/api", require('./api/feature/feature.route'));
  // app.use("/api", require('./api/Permission/permission.route'));
  // app.use("/api", require('./api/tagSettings/tagSettings.route'));
  // app.use("/api", require('./api/tags/tags.route'))
  // app.use("/api", require('./api/userPostLike/userPostLike.route'))
  // app.use("/api", require('./api/staticsDataForApp/staticsDataForApp.route'))
  // app.use("/api", require('./api/support/support.route'));
  // app.use("/api", require('./api/paymentDetail/paymentHistory.route'));
};