'use strict';

//const async = require('async');

module.exports = function(RED) {

    function AnamicoChangeLight(config) {
        RED.nodes.createNode(this, config);
        this.configError = false;
        this._lights = RED.nodes.getNode(config.lights);

        var node = this;

        /**
         * handle inputs
         */
        // LIFX {
        //      lightLabel: "Lifx"
        //      on: true
        //      hue: "21"
        //      saturation: "30"
        //      luminance: "100"
        //      whiteColor: "3200"
        //      fadeTime: "1"
        // }
        //
        // HUE {
        //      on: false
        //      brightness: 0
        //      reachable: true
        //      rgb: array[3]
        //      hex: "fff7f5"
        //      color: "white"
        //      colorTemp: 167
        //      updated: "2018-12-11T22:52:42+10:00"
        // }

        node.on('input', function(msg) {
            node.log(node);

            // if (this.configError) { return; }  // ignore everything if in error state, can only redeploy to fix this state
            //
            // // error if not in homekit mode and we get a homekit message
            // if (!this.fromHomekit && msg.hap && msg.hap.context) {
            //     node.error('homekit message received when not in homekit mode', msg);
            //     node.status({ fill: "red", shape: "dot", text: "homekit message received" });
            //     this.configError = true;
            //     return
            // }
            //
            // // silently ignore non-homekit messages (if we are expecting homekit) to avoid loops
            // if (this.fromHomekit && !(msg.hap && msg.hap.context)) {
            //     return
            // }
            // delete msg.hap; // make sure we remove "hap" details to avoid future problems down the track.
            //
            // if (!msg.payload) {
            //     node.error('empty message received', msg);
            //     node.status({ fill: "red", shape: "dot", text: "empty message received" });
            //     return
            // }
            //
            // node.status({ fill: "blue", shape:"dot", text: "updating panel..." });
            // node._panel.setState(msg, function(result) {
            //     node.status({ fill: result.error ? "red" : "green", shape: "dot", text: result.label });
            // });
        });

        /**
         * listen for panel state changes
         */
        node._lights && node._lights.registerStateListener(this, function(msg) {
            if (node.configError) { node._panel.deregisterStateListener(node); return; }   // ignore everything if in error state, can only redeploy to fix this state
            node.status({
                fill: node._panel.isAlarm ? "red" : "green",
                shape:"dot",
                text:node._panel.alarmModes[node._panel.alarmState]
            });

            node.send(msg);
        });

        /**
         * clean up on node removal
         */
        node.on('close', function() {
            node._lights && node._lights.deregisterStateListener(node);
        });
    }
    RED.nodes.registerType("AnamicoChangeLight", AnamicoChangeLight);
};
