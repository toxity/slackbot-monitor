/**
 * Created by im on 5/5/17.
 */
const moment = require('moment');

module.exports = [
    {
        command: "help",
        callback: function () {
            let message;
            if (this.commands.length) {
                message = `My available commands:\n`;
                for (const command of this.commands) {
                    if (command.helpText && command.helpText.length) {
                        message += `\n\t ${command.helpText}`;
                    }
                }
                return this.postMessage(message);
            }
            return this.postWarn("Command's list is empty!");
        }
    },
    {
        command: "list",
        help: `list - information about instances under the watch`,
        callback: function () {
            if (!this.monitor.hasItems()) {
                return this.postWarn("No instances found");
            }

            let message = `Instances under monitor:\n`;
            for (const instance of this.monitor.getItems()) {
                message += `\n\t${instance.host} - ${instance.getUpStatus()}`;
            }

            this.postMessage(message);
        }
    },
    {
        command: "aliases",
        help: `aliases - information about available aliases`,
        callback: function () {
            if (!this.monitor.hasItems()) {
                return this.postWarn("No instances found");
            }

            let message = `Available aliases:\n`;
            for (const instance of this.monitor.getItems()) {
                message += `\n\t${instance.host} - ${instance.alias}`;
            }

            this.postMessage(message);
        }
    },
    {
        command: "status",
        callback: function (host) {
            if (!host) {
                return this.postWarn("This command requires instance url or alias");
            }

            const instance = this.monitor.get(this._parseLink(host));
            if (!instance) {
                return this.postWarn(`Can't find instance - ${host}`);
            }
            return this.postMessage(`${instance.host} : \n\t watcher status: ${instance.getJobStatus(true)} \n\t server status: ${instance.getUpStatus(true)}`);
        }
    },
    {
        command: "add",
        help: `add <host|alias> - add new instance for watching`,
        callback: function (host) {
            if (!host) {
                return this.postWarn("This command requires instance url or alias");
            }
            
            const instance = this.addHost(host);

            if (!instance) {
                return this.postWarn("This instance already under the watch");
            }
            this.postMessage(`Success. Now watching for - ${instance.host} with alias \`${instance.alias}\``);

        }
    },
    {
        command: "remove",
        help: `remove <host|alias> - remove instance from watching`,
        callback: function (host) {
            if (!host) {
                return this.postWarn("This command requires instance url or alias");
            }

            const result = this.monitor.remove(this._parseLink(host));
            this.postMessage(result ? `Host ${host} was successfully removed`:`Can't find host with name - ${host}`);

        }
    },
    {
        command: "stop",
        help: `stop <host|alias> - stop instance's watcher`,
        callback: function (name) {
            this.monitor.getAndCall(name, (instance) => {
                instance.stopJob();
                this.postMessage(`Job for instance ${instance.host} was stopped`);
            })
        }
    },
    {
        command: "start",
        help: `start <host|alias> - start instance's watcher`,
        callback: function (name) {
            this.monitor.getAndCall(name, (instance) => {
                instance.resumeJob();
                this.postMessage(`Job for instance ${instance.host} was started`);
            })
        }
    },

    {
        command: "ping",
        callback: function () {
            this.postMessage("pong");
        }
    },
    {
        command: "time",
        help: `time - bot's local time`,
        callback: function () {
            this.postMessage(`My local time is - ${moment().format('DD.MM.YYYY hh:mm:ss')}`)
        }
    }
];