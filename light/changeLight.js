'use strict';

//const async = require('async');

module.exports = function(RED) {

    function AnamicoChangeLight(config) {
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
         * handle inputs
         */
        node.on('input', function(msg) {
            node.log(msg);

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
        node._lights && node._lights.registerStateListener(node, function(msg) {

            node.status({
                fill:   msg.payload.on ? "green" : "gray",
                shape:  "dot",
                text:   msg.payload.on ? (msg.payload.luminance ? ((msg.payload.luminance/100) * 100).toFixed(2) + '%' : 'on') : 'off'
            });
            // reformat the command to match the type of light



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
