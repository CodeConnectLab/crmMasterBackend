
module.exports = function (app, config) {

  const winston = require('winston');
  const dailyRotateFile = require('winston-daily-rotate-file');
  const { combine, timestamp, printf, colorize, align } = winston.format;
  const console = new winston.transports.Console({
    colorize: true, json: true, format:
      combine(
        printf((info) =>
          `[${new Date().toISOString()}] ${info.level}: ${info.message.method} ${info.message.url}`
        )
      )
  });

  let env = app.get('env');
  /* Request Logging : Set winston request logger: it will print log when any request comes to server*/
  if ('development' === env || 'test' === env) {
    let logger = winston.createLogger({ transports: [console] });
    app.use(require('winston-request-logger').create(logger));
  }

  let generalLogTasks = [
    new dailyRotateFile({
      filename: config.root + '/logs/%DATE%/all-logs.log',
      datePattern: 'YYYY-MM-DD',
      // prepend: true
    })
  ]

  let exceptionLogTasks = [
    new dailyRotateFile({
      filename: config.root + '/logs/%DATE%/exception.log',
      datePattern: 'YYYY-MM-DD',
      // prepend: true
    })
  ];

  if (config.logOnScreen) {
    generalLogTasks.push(console);
    exceptionLogTasks.push(console);
  }

  const logger = winston.createLogger({
    transports: generalLogTasks,
    exceptionHandlers: exceptionLogTasks
  });

  return logger;
}

