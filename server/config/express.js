/**
 * Express configuration
 */

'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./environment');
const winston = require('winston');
const mailer = require('../mailer');

module.exports = function (app) {
  app.use(cors({
    origin: [
      'http://13.200.34.99/',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000'
    ]
  }))
  app.use('/api/static', express.static(path.join(__dirname, '../', 'uploads')))
  app.use('/api/temp', express.static(path.join(__dirname, '../', 'temp')))
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    limit: '10mb',
    extended: true,
    verify: function (req, res, buf, encoding) {
      // get rawBody        
      req.rawBody = buf;
    }
  }));

  app.use(methodOverride());
  app.use(cookieParser());
};
