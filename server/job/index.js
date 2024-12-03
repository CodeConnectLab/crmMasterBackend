'use strict';

const cron = require('cron'),
    mailer = require('../mailer'),
    moment = require('moment-timezone');


if(process.env.LOCAL) {
    console.log("Local no CRON required!", process.env.LOCAL)
    return;
};

var job1 = new cron.CronJob(
    '* * 13 2,3 * *',
     function () {
        //write your code here
        console.log("12");
    },
    false,
    'Asia/Kolkata'
);

// job1.start(); // job 1 started