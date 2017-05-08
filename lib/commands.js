"use strict";

/**
 * Created by im on 5/5/17.
 */
module.exports = [{
    command: "help",
    callback: function callback(text) {
        var message = void 0;
        if (this.commands.length) {
            message = "My available commands:\n";
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.commands[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var command = _step.value;

                    if (command.helpText && command.helpText.length) {
                        message += "\n " + command.helpText;
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return this.postMessage(message);
        }
        return this.postWarn("Command's list is empty!");
    }
}, {
    command: "list",
    help: "\t list - information about instances under the watch",
    callback: function callback() {
        if (!this.monitor.hasItems()) {
            return this.postWarn("No instances found");
        }

        var message = "Instances under monitor (name|watcher status|up status):\n";
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = this.monitor.getItems()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var instance = _step2.value;

                message += "\n\t" + instance.host + " (" + instance.alias + ") | " + instance.getJobStatus() + " | " + instance.getUpStatus() + " |";
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        this.postMessage(message);
    }
}, {
    command: "status",
    callback: function callback(host) {
        if (!host) {
            return this.postWarn("This command requires instance url or alias");
        }

        var instance = this.monitor.get(this._parseLink(host));
        if (!instance) {
            return this.postWarn("Can't find instance - " + host);
        }
        return this.postMessage(instance.host + " : \n\t watcher status: " + instance.getJobStatus(true) + " \n\t server status: " + instance.getUpStatus());
    }
}, {
    command: "add",
    help: "\t add <host|alias> - add new instance for watching",
    callback: function callback(host) {
        if (!host) {
            return this.postWarn("This command requires instance url or alias");
        }

        var instance = this.addHost(host);

        if (!instance) {
            return this.postWarn("This instance already under the watch");
        }
        this.postMessage("Success. Now watching for - " + instance.host + " with alias `" + instance.alias + "`");
    }
}, {
    command: "remove",
    help: "\t remove <host|alias> - remove instance from watching",
    callback: function callback(host) {
        if (!host) {
            return this.postWarn("This command requires instance url or alias");
        }

        var result = this.monitor.remove(this._parseLink(host));
        this.postMessage(result ? "Host " + host + " was successfully removed" : "Can't find host with name - " + host);
    }
}, {
    command: "stop",
    help: "\t stop <host|alias> - stop instance's watcher",
    callback: function callback(name) {
        var _this = this;

        this.monitor.getAndCall(name, function (instance) {
            instance.stopJob();
            _this.postMessage("Job for instance " + instance.host + " was stopped");
        });
    }
}, {
    command: "start",
    help: "\t start <host|alias> - start instance's watcher",
    callback: function callback(name) {
        var _this2 = this;

        this.monitor.getAndCall(name, function (instance) {
            instance.resumeJob();
            _this2.postMessage("Job for instance " + instance.host + " was started");
        });
    }
}, {
    command: "ping",
    callback: function callback() {
        this.postMessage("pong");
    }
}, {
    command: "time",
    help: "help - return bot's local time",
    callback: function callback() {
        this.postMessage("My local time is - " + moment().format('DD.MM.YYYY hh:mm:ss'));
    }
}];
//# sourceMappingURL=commands.js.map