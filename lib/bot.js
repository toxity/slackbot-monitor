/**
 * Created by im on 4/24/17.
 */
'use strict';

var monitor = require('host-monitor');
var logger = require('simple-log-manager');
var moment = require('moment');

var inputLogs = logger.createFileLogger("inputs", {
    fileNamePattern: "inputs-<DATE>.log",
    dir: require('path').join(__dirname, "..", "logs")
});

var botLogs = logger.createFileLogger("bot", {
    fileNamePattern: "bot-<DATE>.log",
    dir: require('path').join(__dirname, "..", "logs")
});

var ISBot = function ISBot() {
    this.commands = [];

    this.getLogger = function () {
        return logger;
    };

    this.init = function (config) {
        if (!config || !config.token || !config.channel) {
            throw Error("Config for bot is not specified!");
        }

        var SlackBot = require('slackbots');
        this.bot = new SlackBot(config);
        this.channel = config.channel;

        this._initEvents();
    };

    this.addCommand = function (data) {
        if (!data || !data.command || !data.callback) {
            throw Error("Invalid command obj for bot");
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = this.commands[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var command = _step.value;

                if (command.name === data.command) {
                    botLogs.error('Trying to add command ' + data.command + ' againstance url or aliais');
                    return;
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

        var name = 'run' + data.command[0].toUpperCase() + data.command.slice(1);

        if (name in this) {
            botLogs.error('Trying to add command with invalid name - ' + data.command);
            return;
        }

        this[name] = data.callback;
        this.commands.push({ name: data.command, helpText: data.help });
        botLogs.log('New command for bot was added ', data.command);
    };

    this._parseLink = function (link) {
        if (link && link.match(/^<http/)) {
            if (link.match(/^<http(.*)\|.*>/)) {
                return link.split(/<|\||>/)[2];
            }
            return link.replace(/<|>|https|http|:|\/\//g, '');
        }
        return link;
    };

    this.execute = function (message) {
        var command = this.parseCommand(message);
        var args = null;

        if (command.length > 1) {
            args = command.slice(1, command.length);
        }
        command = command[0].toLowerCase();

        var funName = 'run' + command[0].toUpperCase() + command.slice(1);

        if (!(funName in this)) {
            return this.postMessage('Sorry but I don\'t understand your command `' + command + '` :confused:');
        }

        botLogs.log('Command ' + command + ' was found. ', args ? 'Arguments: ' + args : "");

        try {
            this[funName].apply(this, args);
        } catch (err) {
            this.portWarn('Error: ' + (err.message || "Unknown error in bot.js"));
        }
    };

    this.parseCommand = function (message) {
        var text = this.getParsedMessage(message);
        return text.split(" ");
    };

    this.getParsedMessage = function (message) {
        return message.replace(/^<@.*> /g, "");
    };

    this.postMessage = function (message) {
        this.bot.postMessage(this.channel, message, { 'slackbot': true });
    };

    this.portWarn = function (message) {
        this.postMessage('`WARN:` ' + message);
    };

    this._isToMe = function (message) {
        var match = message.text.match(/^<@/);
        if (match) {
            return this.bot.self.id === message.text.split(/<@|>/)[1];
        }
    };

    this._isFromBot = function (message) {
        return message.subtype === "bot_message";
    };

    this._isChatMessage = function (message) {
        return message.type === 'message' && Boolean(message.text);
    };

    this._isChannelConversation = function (message) {
        return typeof message.channel === 'string' && message.channel[0] === 'C';
    };

    this._initEvents = function () {
        var _this = this;

        this.bot.on('start', function () {
            _this.postMessage("Bot started!");
        });

        this.bot.on('error', function () {
            throw Error("Error during connection to Slack!");
        });

        this.bot.on('message', function (data) {
            if (_this._isChatMessage(data) && _this._isChannelConversation(data) && !_this._isFromBot(data) && _this._isToMe(data)) {
                _this.execute(data.text);

                _this.bot.getUserById(data.user).done(function (user) {
                    inputLogs.log("Message to bot: ", data.text.replace(/^<@.*> /g, ""), ' From user: ' + (user ? user.name : "Unknown"));
                });
            }
        });
    };
};

var isBot = new ISBot();
var defaultCommands = [{
    command: "help",
    callback: function callback(text) {
        var message = void 0;
        if (this.commands.length) {
            message = "My available commands:\n";
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this.commands[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var command = _step2.value;

                    if (command.helpText && command.helpText.length) {
                        message += '\n ' + command.helpText;
                    }
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

            return this.postMessage(message);
        }
        return this.portWarn("Command's list is empty!");
    }
}, {
    command: "list",
    help: '\t list - information about instances under the watch',
    callback: function callback() {
        if (!monitor.hasItems()) {
            return this.portWarn("No instances found");
        }

        var message = 'Instances under monitor (name|watcher status|up status):\n';
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = monitor.getItems()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var instance = _step3.value;

                message += '\n\t' + instance.host + ' (' + instance.alias + ') | ' + instance.getJobStatus() + ' | ' + instance.getUpStatus() + ' |';
            }
        } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                }
            } finally {
                if (_didIteratorError3) {
                    throw _iteratorError3;
                }
            }
        }

        this.postMessage(message);
    }
}, {
    command: "status",
    callback: function callback(host) {
        if (!host) {
            return this.portWarn("This command requires instance url or alias");
        }

        var instance = monitor.get(this._parseLink(host));
        if (!instance) {
            return this.portWarn('Can\'t find instance - ' + host);
        }
        return this.postMessage(instance.host + ' : \n\t watcher status: ' + instance.getJobStatus(true) + ' \n\t server status: ' + instance.getUpStatus());
    }
}, {
    command: "add",
    help: '\t add <host|alias> - add new instance for watching',
    callback: function callback(host) {
        var _this2 = this;

        if (!host) {
            return this.portWarn("This command requires instance url or alias");
        }

        host = this._parseLink(host);

        var onUp = function onUp() {
            _this2.postMessage(instance.getUpMsg());
        };
        var onDown = function onDown() {
            _this2.postMessage(instance.getDownMsg());
        };

        var instance = monitor.register(host, onUp, onDown);

        if (!instance) {
            return this.portWarn("This instance already under the watch");
        }
        this.postMessage('Success. Now watching for - ' + instance.host + ' with alias `' + instance.alias + '`');
    }
}, {
    command: "remove",
    help: '\t remove <host|alias> - remove instance from watching',
    callback: function callback(host) {
        if (!host) {
            return this.portWarn("This command requires instance url or alias");
        }

        var result = monitor.remove(this._parseLink(host));
        this.postMessage(result ? 'Host ' + host + ' was successfully removed' : 'Can\'t find host with name - ' + host);
    }
}, {
    command: "stop",
    help: '\t stop <host|alias> - stop instance\'s watcher',
    callback: function callback(name) {
        var _this3 = this;

        monitor.getAndCall(name, function (instance) {
            instance.stopJob();
            _this3.postMessage('Job for instance ' + instance.host + ' was stopped');
        });
    }
}, {
    command: "start",
    help: '\t start <host|alias> - start instance\'s watcher',
    callback: function callback(name) {
        var _this4 = this;

        monitor.getAndCall(name, function (instance) {
            instance.resumeJob();
            _this4.postMessage('Job for instance ' + instance.host + ' was started');
        });
    }
}, {
    command: "ping",
    callback: function callback() {
        this.postMessage('pong');
    }
}, {
    command: "time",
    help: 'help - return bot\'s local time',
    callback: function callback() {
        this.postMessage('My local time is - ' + moment().format('DD.MM.YYYY hh:mm:ss'));
    }
}];

var _iteratorNormalCompletion4 = true;
var _didIteratorError4 = false;
var _iteratorError4 = undefined;

try {
    for (var _iterator4 = defaultCommands[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var command = _step4.value;

        isBot.addCommand(command);
    }
} catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
} finally {
    try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
        }
    } finally {
        if (_didIteratorError4) {
            throw _iteratorError4;
        }
    }
}

module.exports = isBot;
//# sourceMappingURL=bot.js.map