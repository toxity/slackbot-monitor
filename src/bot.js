/**
 * Created by im on 4/24/17.
 */
'use strict';
const moment = require('moment');
const monitor = require('host-monitor');
const slackbots = require('slackbots');

const getLogger = function (name) {
    const manager = require('simple-log-manager');

    if (process.env.LOG && Boolean(process.env.LOG) === false) {
        return manager.createDummyLogger(name);

    }

    if (Boolean(process.env.DEBUG)) {
        return manager.createConsoleLogger(name);
    }
    return manager.createFileLogger(name, {
        fileNamePattern: "name-<DATE>.log",
        dir: require('path').join(__dirname, "..", "logs")
    })
};

const inputLogs = getLogger("inputs");
const botLogs = getLogger("bot");

const ISBot = function () {
    this.commands = [];

    this.monitor = monitor;

    this.botConfig = {
        startupMessage: true
    };

    this.config = function (data) {
        if (!data) {
            return this.botConfig;
        }

        if (typeof data !== "object") {
            throw Error ("Unknown config type")
        }
        for (const prop in data) {
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

        const SlackBot = slackbots;
        this.bot = new SlackBot(config);
        this.channel = config.channel;

        this._initEvents();
    };

    this.addHost = function (host) {
        host = this._parseLink(host);

        const bot = this;

        const onUp = function () {
            bot.postMessage(`<${this.url}|${this.host}> is back online :tada:`);
        };
        const onDown = function () {
            bot.postMessage(`<${this.url}|${this.host}> is down :boom:`);
        };

        return this.monitor.register(host, onUp, onDown);
    };

    this.addCommand = function (data) {
        if (!data || !data.command || !data.callback) {
            throw Error ("Invalid command obj for bot");
        }

        for (const command of this.commands) {
            if (command.name === data.command) {
                botLogs.error(`Trying to add already existed command - ${data.command}`);
                return;
            }
        }

        const name = `run${data.command[0].toUpperCase()}${data.command.slice(1)}`;

        if (name in this) {
            botLogs.error(`Trying to add command with invalid name - ${data.command}`);
            return;
        }

        this[name] = data.callback;
        this.commands.push({ name:data.command, helpText: data.help });
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
        let command = this.parseCommand(message);
        let args = null;

        if (command.length > 1) {
            args = command.slice(1, command.length);
        }
        command = command[0].toLowerCase();

        const funName = `run${command[0].toUpperCase()}${command.slice(1)}`;

        if (!(funName in this)) {
            return this.postMessage(`Sorry but I don't understand your command \`${command}\` :confused:`)
        }

        botLogs.log(`Command "${command}" was found. `, args ? `Arguments: ${args}`: "");

        try {
            this[funName].apply(this, args);
        } catch (err) {
            this.postWarn(`Error: ${err.message || "Unknown error in bot.js"}`);
        }
    };

    this.parseCommand = function (message) {
        return this.getParsedMessage(message).split(" ");
    };

    this.getParsedMessage = function (message) {
        return message.replace(/^<@.*> /g, "")
    };

    this.postMessage = function (message) {
        this.bot.postMessage(this.channel, message, { 'slackbot': true });
    };

    this.postWarn = function (message) {
        this.postMessage(`\`WARN:\` ${message}`);
    };

    this._isToMe = function (message) {
        const match = message.text.match(/^<@/);
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
        return typeof message.channel === 'string' &&
            message.channel[0] === 'C';
    };

    this._initEvents = function () {
        this.bot.on('start', () => {
            if (this.config().startupMessage) {
                this.postMessage(`Hello everyone, I'm in :sunglasses:`);
            }
        });

        this.bot.on('error', () => {
            throw Error ("Error during connection to Slack!");
        });

        this.bot.on('message', (data) => {
            if (this._isChatMessage(data) && this._isChannelConversation(data) && !this._isFromBot(data) && this._isToMe(data)) {
                this.execute(data.text);

                this.bot.getUserById(data.user).done((user) => {
                    inputLogs.log(`Message to bot: "${data.text.replace(/^<@.*> /g, "")}" | From user: ${user ? user.name : "Unknown"}`);
                });

            }
        });
    }
};

const isBot = new ISBot();

for (const command of require("./commands")) {
    isBot.addCommand(command);
}

module.exports = {
    init: isBot.init.bind(isBot),
    config: isBot.config.bind(isBot),
    addHost: isBot.addHost.bind(isBot),
    addCommand: isBot.addCommand.bind(isBot),
    postMessage: isBot.postMessage.bind(isBot),
    postWarn: isBot.postWarn.bind(isBot)
};