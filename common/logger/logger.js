var winston = require('winston');
var path = require('path');
var moment = require('moment');
require('winston-daily-rotate-file');


var d = new Date();
var date = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ":" + d.getMinutes();

//config logs
var logFileName = 'log.txt';
var logFilePath = path.join(__dirname, '../../logs/', logFileName);

// Create a new winston logger instance with two tranports: Console, and File
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function () {
                return moment().format("YYYY-MM-DD HH:mm:ss");
            }
        }),
        new (winston.transports.File)({
            json: false,
            timestamp: function () {
                return moment().format("YYYY-MM-DD HH:mm:ss");
            },
            filename: logFilePath
        })
    ]
});

exports.logger = logger;

