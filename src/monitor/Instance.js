/**
 * Created by im on 4/21/17.
 */
'use strict';
const moment = require("moment"),
    log = require("./../logger"),
    Job = require("./Job");

const logger = log.create("instance");
const statusLog = log.create("status");

const minute = 60000;

const DEFAULT_INTERVAL = minute;
// const DEFAULT_INTERVAL = minute * 60;
const ALERTED_INTERVAL = minute;

function Instance (host, onUp, onDown, alias) {
    if (!onUp || !onDown) {
        throw Error ("onUp and onDonw callbacks should be specified!");
    }
    this.onUp = onUp;
    this.onDown = onDown;

    this.host = host;
    this.url = host.match(/^http/) ? host : "http://"+host;
    this.alias = alias ? alias : null;

    this.lastStatus = null;
    this.downFrom = null;

    this._initJob();
}

Instance.prototype = {
    _initJob: function () {
        this.job = new Job();
        this.runDefaultJob()
    },

    restartJob: function (jobFn, interval) {
        logger.log(`-- Started job for ${this.host} with interval ${interval}`);
        this.job.restart(jobFn, interval);
    },

    runDefaultJob: function (interval) {
        this.restartJob(this.checkFunc.bind(this), DEFAULT_INTERVAL);
    },

    runAlertedJob: function () {
        let counter = 0;
        this.restartJob(this.checkFunc.bind(this), ALERTED_INTERVAL);

        this.job
            .runUntil(() => {
                return counter++ > 60;
            })
            .onEnd(() => {
                this.runDefaultJob()
            })
    },

    checkFunc: function () {
        require("is-reachable")(this.host).then(reachable => {
            statusLog.info(`${moment().format('DD/MMM_HH:mm')} | ${reachable ? " UP " : "DOWN"} | ${this.host} `);
            this.updateStatus(reachable);
        });
    },

    updateStatus: function (status) {
        if (status) {
            if (this.isWasDown()) {
                this.lastStatus = true;
                this.markUp();
            }
        } else {
            if (this.isWasUp()) {
                this.lastStatus = false;
                this.markDown();
            } else if (this.lastStatus === null) {
                this.lastStatus = false;
                this.markDown(true);
            }
        }
        this.lastStatus = status;
    },

    isDown: function () {
        return !!this.downFrom;
    },

    getDownDate: function () {
        return this.downFrom.format("DD_MM HH:mm");
    },

    markDown: function (startup) {
        this.downFrom = moment();
        this.onDown();

        if (!startup) {
            this.runAlertedJob();
        }
    },

    markUp: function () {
        this.downFrom = null;
        this.onUp();
    },

    resumeJob: function () {
        this.job.run();
    },

    getJobStatus: function () {
        const status = this.job ? this.job.status : null;

        if (typeof status === 'string') {
            return status;
        }

        if (status === null) {
            return "Not started";
        } else if (status === true) {
            return "Working"
        }
    },

    getUpStatus: function () {
        if (this.lastStatus === null) {
            return "Checking";
        }
        return this.isDown() ? `DOWN | Was up on ${this.getDownDate()}` : "UP";
    },

    stopJob: function () {
        this.job.stop();
    },

    isWasDown: function () {
        return this.lastStatus === false;
    },

    isWasUp: function () {
        return this.lastStatus === true;
    },

    getDownMsg: function () {
        return `<https://${this.url}|${this.host}> is down! :boom:`;
    },

    getUpMsg: function () {
        return `<https://${this.url}|${this.host}> is back online! :tada:`;
    }
};


module.exports = Instance;
