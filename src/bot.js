/**
 * Created by im on 4/24/17.
 */
'use strict';
const monitor = require('host-monitor');
const logger = require('simple-log-manager');
const moment = require('moment');

const inputLogs = logger.createFileLogger("inputs", {
    fileNamePattern: "inputs-<DATE>.log",
    dir: require('path').join(__dirname, "..", "logs")
});

const botLogs = logger.createFileLogger("bot", {
    fileNamePattern: "bot-<DATE>.log",
    dir: require('path').join(__dirname, "..", "logs")
});


const ISBot = function () {
    this.commands = [];

    this.getLogger = function () {
        return logger;
    };

    this.init = function (config) {
        if (!config || !config.token || !config.channel) {
            throw Error("Config for bot is not specified!");
        }

        const SlackBot = require('slackbots');
        this.bot = new SlackBot(config);
        this.channel = config.channel;

        this._initEvents();
    };

    this.addCommand = function (data) {
        if (!data || !data.command || !data.callback) {
            throw Error ("Invalid command obj for bot");
        }

        for (const command of this.commands) {
            if (command.name === data.command) {
                botLogs.error(`Trying to add command ${data.command} againstance url or aliais`);
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

        botLogs.log(`Command ${command} was found. `, args ? `Arguments: ${args}`: "");

        try {
            this[funName].apply(this, args);
        } catch (err) {
            this.portWarn(`Error: ${err.message || "Unknown error in bot.js"}`);
        }
    };

    this.parseCommand = function (message) {
        const text = this.getParsedMessage(message);
        return text.split(" ");
    };

    this.getParsedMessage = function (message) {
        return message.replace(/^<@.*> /g, "")
    };

    this.postMessage = function (message) {
        this.bot.postMessage(this.channel, message, { 'slackbot': true });
    };

    this.portWarn = function (message) {
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
            this.postMessage("Bot started!");
        });

        this.bot.on('error', () => {
            throw Error ("Error during connection to Slack!");
        });

        this.bot.on('message', (data) => {
            if (this._isChatMessage(data) && this._isChannelConversation(data) && !this._isFromBot(data) && this._isToMe(data)) {
                this.execute(data.text);

                this.bot.getUserById(data.user).done((user) => {
                    inputLogs.log("Message to bot: ", data.text.replace(/^<@.*> /g, ""), ` From user: ${user ? user.name : "Unknown"}`);
                });

            }
        });
    }
};

const isBot = new ISBot();
const defaultCommands = [
    {
        command: "help",
        callback: function (text) {
            let message;
            if (this.commands.length) {
                message = "My available commands:\n";
                for (const command of this.commands) {
                    if (command.helpText && command.helpText.length) {
                        message += `\n ${command.helpText}`;
                    }
                }
                return this.postMessage(message);
            }
            return this.portWarn("Command's list is empty!");
        }
    },
    {
        command: "list",
        help: `\t list - information about instances under the watch`,
        callback: function () {
            if (!monitor.hasItems()) {
                return this.portWarn("No instances found");
            }

            let message = `Instances under monitor (name|watcher status|up status):\n`;
            for (const instance of monitor.getItems()) {
                message += `\n\t${instance.host} (${instance.alias}) | ${instance.getJobStatus()} | ${instance.getUpStatus()} |`;
            }

            this.postMessage(message);
        }
    },

    {
        command: "status",
        callback: function (host) {
            if (!host) {
                return this.portWarn("This command requires instance url or alias");
            }

            const instance = monitor.get(this._parseLink(host));
            if (!instance) {
                return this.portWarn(`Can't find instance - ${host}`);
            }
            return this.postMessage(`${instance.host} : \n\t watcher status: ${instance.getJobStatus(true)} \n\t server status: ${instance.getUpStatus()}`);
        }
    },
    {
        command: "add",
        help: `\t add <host|alias> - add new instance for watching`,
        callback: function (host) {
            if (!host) {
                return this.portWarn("This command requires instance url or alias");
            }

            host = this._parseLink(host);

            const onUp = () => {
                this.postMessage(instance.getUpMsg());
            };
            const onDown = () => {
                this.postMessage(instance.getDownMsg());
            };

            const instance = monitor.register(host, onUp, onDown);

            if (!instance) {
                return this.portWarn("This instance already under the watch");
            }
            this.postMessage(`Success. Now watching for - ${instance.host} with alias \`${instance.alias}\``);

        }
    },
    {
        command: "remove",
        help: `\t remove <host|alias> - remove instance from watching`,
        callback: function (host) {
            if (!host) {
                return this.portWarn("This command requires instance url or alias");
            }

            const result = monitor.remove(this._parseLink(host));
            this.postMessage(result ? `Host ${host} was successfully removed`:`Can't find host with name - ${host}`);

        }
    },
    {
        command: "stop",
        help: `\t stop <host|alias> - stop instance's watcher`,
        callback: function (name) {
            monitor.getAndCall(name, (instance) => {
                instance.stopJob();
                this.postMessage(`Job for instance ${instance.host} was stopped`);
            })
        }
    },
    {
        command: "start",
        help: `\t start <host|alias> - start instance's watcher`,
        callback: function (name) {
            monitor.getAndCall(name, (instance) => {
                instance.resumeJob();
                this.postMessage(`Job for instance ${instance.host} was started`);
            })
        }
    },

    {
        command: "ping",
        callback: function () {
            this.postMessage(`pong`);
        }
    },
    {
        command: "time",
        help: `help - return bot's local time`,
        callback: function () {
            this.postMessage(`My local time is - ${moment().format('DD.MM.YYYY hh:mm:ss')}`)
        }
    }

];

for (const command of defaultCommands) {
    isBot.addCommand(command);
}

module.exports = isBot;