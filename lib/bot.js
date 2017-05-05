/**
 * Created by im on 4/24/17.
 */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var moment = require('moment');
var monitor = require('host-monitor');

var getLogger = function getLogger(name) {
    var manager = require('simple-log-manager');

    if (process.env.LOG && Boolean(process.env.LOG) === false) {
        return manager.createDummyLogger(name);
    }

    if (Boolean(process.env.DEBUG)) {
        return manager.createConsoleLogger(name);
    }
    return manager.createFileLogger(name, {
        fileNamePattern: "name-<DATE>.log",
        dir: require('path').join(__dirname, "..", "logs")
    });
};

var inputLogs = getLogger("inputs");
var botLogs = getLogger("bot");

var ISBot = function ISBot() {
    this.commands = [];

    this.monitor = monitor;

    this.botConfig = {
        startupMessage: true
    };

    this.config = function (data) {
        if (!data) {
            return this.botConfig;
        }

        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== "object") {
            throw Error("Unknown config type");
        }
        for (var prop in data) {
            if (prop in this.botConfig) {
                this.botConfig[prop] = data[prop];
            } else {
                botLogs.error("Trying to set unknown property -", prop);
            }
        }
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

    this.addHost = function (host) {
        host = this._parseLink(host);

        var bot = this;

        var onUp = function onUp() {
            bot.postMessage('<' + this.url + '|' + this.host + '> is back online :tada:');
        };
        var onDown = function onDown() {
            bot.postMessage('<' + this.url + '|' + this.host + '> is down :boom:');
        };

        return this.monitor.register(host, onUp, onDown);
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
                    botLogs.error('Trying to add already existed command - ' + data.command);
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
        botLogs.log('New command for bot was added -', data.command);
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

        botLogs.log('Command "' + command + '" was found. ', args ? 'Arguments: ' + args : "");

        try {
            this[funName].apply(this, args);
        } catch (err) {
            this.postWarn('Error: ' + (err.message || "Unknown error in bot.js"));
        }
    };

    this.parseCommand = function (message) {
        return this.getParsedMessage(message).split(" ");
    };

    this.getParsedMessage = function (message) {
        return message.replace(/^<@.*> /g, "");
    };

    this.postMessage = function (message) {
        this.bot.postMessage(this.channel, message, { 'slackbot': true });
    };

    this.postWarn = function (message) {
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
            if (_this.config().startupMessage) {
                _this.postMessage('Hello everyone, I\'m in :sunglasses:');
            }
        });

        this.bot.on('error', function () {
            throw Error("Error during connection to Slack!");
        });

        this.bot.on('message', function (data) {
            if (_this._isChatMessage(data) && _this._isChannelConversation(data) && !_this._isFromBot(data) && _this._isToMe(data)) {
                _this.execute(data.text);

                _this.bot.getUserById(data.user).done(function (user) {
                    inputLogs.log('Message to bot: "' + data.text.replace(/^<@.*> /g, "") + '" | From user: ' + (user ? user.name : "Unknown"));
                });
            }
        });
    };
};

var isBot = new ISBot();

var _iteratorNormalCompletion2 = true;
var _didIteratorError2 = false;
var _iteratorError2 = undefined;

try {
    for (var _iterator2 = require("./commands")[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var command = _step2.value;

        isBot.addCommand(command);
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

module.exports = {
    init: isBot.init.bind(isBot),
    config: isBot.config.bind(isBot),
    addHost: isBot.addHost.bind(isBot),
    addCommand: isBot.addCommand.bind(isBot),
    postMessage: isBot.postMessage.bind(isBot),
    postWarn: isBot.postWarn.bind(isBot)
};
//# sourceMappingURL=bot.js.map