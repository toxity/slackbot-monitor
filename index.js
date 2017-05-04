/**
 * Created by im on 4/21/17.
 */
'use strict';

if (!process.env.TOKEN) {
    console.error("Token is not specified!");
    process.exit(1);
}

if (!process.env.CHANNEL) {
    console.error("Slack channel should be specified");
    process.exit(1);
}

require('./lib/bot').init({
    token: process.env.TOKEN,
    channel: process.env.CHANNEL
});


console.log("Slackbot was started. Chech your slack for details");