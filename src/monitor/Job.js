/**
 * Created by im on 4/24/17.
 */
'use strict';
function isFunction(val) {
    return Object.prototype.toString.call(val) === '[object Function]';
}

function Job () { }

Job.prototype = {
    reset: function () {
        this.stop();

        this.status = false;
        this.mainInterval = null;
        this.pauseInterval = null;
        this.mainFn = null;
        this.runUntilFn = null;
        this.onEndFn = null;
        this.pauseWhenFn = null;
    },
    start: function () {
        this.restart.apply(this, arguments);
    },

    restart: function (jobFn, interval) {
        if (typeof jobFn !== 'function') {
            throw "Invalid callback fro job!";
        }
        if (typeof interval !== 'number') {
            throw "Invalid interval fro job!";
        }

        if (this.status) {
            this.reset();
        }

        this.mainFn = jobFn;
        this.mainInterval = interval;
        this.run();
    },

    run: function () {
        if (this.status) {
            return;
        }

        this.status = true;
        this._runner();
    },

    _runner: function () {
        const job = this;

        this._runnderId = setTimeout(function() {
            isFunction(job.mainFn) && job.mainFn();

            // when untilFn() returns true, call endFn and stop the runner
            if (isFunction(job.runUntilFn) && job.runUntilFn() === true) {
                isFunction(job.onEndFn) && job.onEndFn();
                return;
            }

            if (isFunction(job.pauseWhenFn) && job.pauseWhenFn() === true) {
                setTimeout(function() {
                    job.run(job.mainFn, job.mainInterval);
                }, job.pauseInterval || 10);

                // isFunction(this._holder.whenPausedFn) && holder.whenPausedFn();

                return;
            }

            job._runner(job.mainFn, job.mainInterval);

        }, this.mainInterval || 10);
    },

    pauseWhen: function(pauseWhenFn, pauseTime) {
        this.pauseWhenFn = pauseWhenFn;
        this.pauseInterval = pauseTime;
        return this;
    },

    /**
     * call the specified function when paused
     */
    whenPaused: function(whenPausedFn) {
        this.pauseWhenFn = whenPausedFn;
        return this;
    },

    /**
     * stop running when untilFn() returns true
     */
    runUntil: function(untilFn) {
        this.runUntilFn = untilFn;
        return this;
    },

    /**
     * call the handler after runner stopped
     */
    onEnd: function(endFn) {
        this.onEndFn = endFn;
        return this;
    },

    /**
     * stop runner
     */
    stop: function () {
        clearTimeout(this._runnderId);
        this.status = "Stopped";
        this._runnderId = null;
        return this;
    }

};

module.exports = Job;




