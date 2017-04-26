/**
 * Created by im on 4/24/17.
 */
'use strict';
const logger = require('simple-node-logger');

const loggers = [];

const outputs = ["console", "file"];
let default_output = "file";

function checkOutput (output) {
    if (!~outputs.indexOf(output)) {
        throw Error ("Invalid output type");
    }
    return true;
}

function Logger (name, output) {
    this.name = name;

    if (!output) {
        this.type = default_output;
    } else {
        checkOutput(output);
        this.type = output;
    }

    if (this.type === "file") {
        const fs = require("fs");
        const path = require("path");
        const logsDir = path.join(__dirname, '..', 'logs');

        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        this.logger = logger.createRollingFileLogger({
            logDirectory: logsDir,
            fileNamePattern: name+'-<DATE>.log',
            dateFormat: 'DD.MM.YYYY'
        });

        this.logger.info("---------------- START OF NEW OUTPUT ----------------");
    }
}

Logger.prototype = {
    isFile: function () {
        return this.type === 'file';
    },
    log: function () {
        if (this.isFile()) {
            return this.logger.info.apply(this.logger, arguments);
        }
        console.log.apply(console, arguments);
    },
    warn: function () {
        if (this.isFile()) {
            return this.logger.warn.apply(this.logger, arguments);
        }
        console.warn.apply(console, arguments);
    },
    error: function () {
        if (this.isFile()) {
            return this.logger.error.apply(this.logger, arguments);
        }
        console.error.apply(console, arguments);
    },
    info: function () {
        if (this.isFile()) {
            return this.logger.info.apply(this.logger, arguments);
        }
        console.info.apply(console, arguments);
    }
};


module.exports = {
    get: function (name) {
        for (const logger of loggers) {
            if (logger.name === name) {
                return logger;
            }
        }
        return null;
    },
    create: function (name, isConsole) {
        for (const logger of loggers) {
            if (logger.name === name) {
                throw Error ("Trying to create logger that already exist "+name);
            }
        }

        const logger = new Logger(name, isConsole);
        loggers.push(logger);
        return logger;
    },
    changeOutput: function (value) {
        checkOutput(value);
        default_output = value;
    }
};