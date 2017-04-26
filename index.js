/**
 * Created by im on 4/21/17.
 */
'use strict';
var path = require("path");
var path = process.env.OLD ? path.join(__dirname, "lib", "bot.js") :  path.join(__dirname, "src", "bot.js");

if (!process.env.TOKEN) {
    console.error("Token is not specified!");
    process.exit(1);
}

if (!process.env.CHANNEL) {
    console.error("Slack channel should be specified");
    process.exit(1);
}

require(path).init({
    token: process.env.TOKEN,
    channel: process.env.CHANNEL,
});


console.log("Slackbot was started. Chech your slack for details");