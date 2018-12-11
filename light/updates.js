'use strict';

//const async = require('async');

module.exports = function(RED) {

    function AnamicoLightUpdates(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this._lights = RED.nodes.getNode(config.lights);

        /**
         * listen for panel state changes
         */
        node._lights && node._lights.registerStateListener(node, function(msg) {

            node.log("new State");
            node.log(JSON.stringify(msg, null, 2));

            node.status({
                fill: node._panel.isAlarm ? "red" : "green",
                shape:"dot",
                text:node._panel.alarmModes[node._panel.alarmState]
            });

            if (node.toHomekit && msg.payload) {
                const oldPayload = msg.payload;
                msg.payload = {};
                if (typeof oldPayload.SecuritySystemTargetState !== "undefined") { msg.payload.SecuritySystemTargetState = oldPayload.SecuritySystemTargetState; }
                if (typeof oldPayload.SecuritySystemCurrentState !== "undefined") { msg.payload.SecuritySystemCurrentState = oldPayload.SecuritySystemCurrentState; }
                if (typeof oldPayload.SecuritySystemAlarmType !== "undefined") { msg.payload.SecuritySystemAlarmType = oldPayload.SecuritySystemAlarmType; }
            }

            node.send(msg);
        });

        /**
         * clean up on node removal
         */
        node.on('close', function() {
            node._lights && node._lights.deregisterStateListener(node);
        });
    }
    RED.nodes.registerType("AnamicoLightUpdates", AnamicoLightUpdates);
};
