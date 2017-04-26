/**
 * Created by im on 4/24/17.
 */
'use strict';
const log =  require('./../logger'),
Instance = require('./Instance');

const logger = log.create("manager");

const Manager = function () {
    this.instances = [];

    this.aliases = [];

    this.register = function (name, onUp, onDown) {
        const host = this._clearUrl(name);

        if (!this._isHost(host)) {
            throw Error ("Invalid url - "+host);
        }

        if (this._isFree(host)) {
            const instance = new Instance(host, onUp, onDown, this._getAlias(name));
            this.instances.push(instance);
            logger.log("Added new instance ", host);
            return instance;
        }
    };

    this.remove = function (name) {
        for (let i=0; i < this.instances.length; i++) {
            const instance = this.instances[i];
            if (instance.alias === name || instance.host === name) {
                instance.stopJob();
                this._removeAlias(instance.alias);
                this.instances.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    this.toInstance = function (name, callback) {
            if (!name) {
                throw Error ("name of instance should be specified!");
            }
            name = this._clearUrl(name);
            const instance = this.getInstanceByName(name);


            if (typeof callback !== 'function') {
                throw Error ("callback should be specified!");
            }

            if (!instance) {
                throw Error ("Can find instance with name - "+name);
            }

            callback(instance);
    };

    this.getInstanceByName = function (name) {
        for (const instance of this.instances) {
            if (instance.alias === name || instance.host === name) {
                return instance;
            }
        }
    };

    this.hasItems = function () {
        return this.instances.length > 0;
    };

    this._getAlias = function (input) {
        input = input.replace(/(^\w+:|^)\/\//, '').replace(".", "");

        let pointer = 3,
            name;

        do {
            name = input.substr(0, pointer++);
        } while (~this.aliases.indexOf(name));

        this.aliases.push(name);

        return name;
    };

    this._removeAlias = function (name) {
        for (let i=0; i < this.aliases.length; i++) {
            if (this.aliases[i] === name) {
                this.aliases.splice(i, 1);
            }
        }
    };

    this._isFree = function (host) {
        for (const inst of this.instances) {
            if (inst.host === host) {
                return false;
            }
        }
        return true;
    };

    this._clearUrl = function (url) {
        if (url && url.match(/http/)) {
            if (url.match(/^<http/)) {
                if (url.match(/^<http(.*)\|.*>/)) {
                    url = url.split(/<|\||>/)[2];
                } else {
                    url = url.replace(/<|>/g, '');
                }
            }
        }
        return url.replace(/(^\w+:|^)\/\//g, '')
    };

    this._isHost = function (host) {
        return /^([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(host);
    }
};

module.exports = new Manager();