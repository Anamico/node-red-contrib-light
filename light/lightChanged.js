'use strict';

//const async = require('async');

module.exports = function(RED) {

    function AnamicoLightChanged(config) {
        RED.nodes.createNode(this, config);
        this._lights = RED.nodes.getNode(config.lights);
        this.name = config.name;
        var node = this;

        /**
         * validate the configuration
         */
        if (!node.name || !node.name.length || node.name.length < 1) {
            node.status({
                fill:   "red",
                shape:  "dot",
                text:   "Missing Name"
            });
            return;
        }

        /**
         * listen for panel state changes
         */
        node._lights && node._lights.registerStateListener(node, function(msg) {

            node.log("new State");
            node.log(JSON.stringify(msg, null, 2));

            node.status({
                fill:   "gray",
                shape:  "dot",
                text:   "off"
            });

            // if (node.toHomekit && msg.payload) {
            //     const oldPayload = msg.payload;
            //     msg.payload = {};
            //     if (typeof oldPayload.SecuritySystemTargetState !== "undefined") { msg.payload.SecuritySystemTargetState = oldPayload.SecuritySystemTargetState; }
            //     if (typeof oldPayload.SecuritySystemCurrentState !== "undefined") { msg.payload.SecuritySystemCurrentState = oldPayload.SecuritySystemCurrentState; }
            //     if (typeof oldPayload.SecuritySystemAlarmType !== "undefined") { msg.payload.SecuritySystemAlarmType = oldPayload.SecuritySystemAlarmType; }
            // }

            node.send(msg);
        });

        /**
         * clean up on node removal
         */
        node.on('close', function() {
            node._lights && node._lights.deregisterStateListener(node);
        });
    }
    RED.nodes.registerType("AnamicoLightChanged", AnamicoLightChanged);
};
