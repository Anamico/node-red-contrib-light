'use strict';

const convert = require('color-convert');

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
            node.debug('light input: ' + JSON.stringify(msg, null, 2));

            node._lights && node._lights.lightChanged(node, msg, function(err, state) {
                // nop?
                node.debug('light input response: ' + JSON.stringify(state, null, 2));
            });
        });


        /**
         * listen for panel state changes
         */
        node._lights && node._lights.registerStateListener(node, function(msg) {

            node.status({
                fill:   msg.payload.on ? "green" : "gray",
                shape:  "dot",
                text:   msg.payload.on ? (msg.payload.bri < 100 ? ((msg.payload.bri/100) * 100).toFixed(0) + '%' : 'on') : 'off'
            });
            // reformat the command to match the type of light
            if ((['Basic','LIFX', 'Homekit'].indexOf(config.mode) > -1) && (typeof msg.payload.hex !== 'undefined')) {
                const hsl = convert.hex.hsv(msg.payload.hex);
                msg.payload.hue = hsl[0];
                msg.payload.sat = hsl[1];
                msg.payload.bri = hsl[2];
                delete msg.payload.hex;
            }
            if (config.mode == 'Homekit') {
                var alreadyOn = false;
                const payload = msg.payload;
                msg.payload = {};

                if (payload.on) {
                    if (payload.bri !== null) {
                        msg.payload.Brightness = payload.bri;
                        alreadyOn = true;
                    }
                    if (payload.hue !== null) {
                        msg.payload.Hue = payload.hue;
                        alreadyOn = true;
                    }
                    if (payload.sat !== null) {
                        msg.payload.Saturation = payload.sat;
                        alreadyOn = true;
                    }
                }

                if (!payload.on || !alreadyOn) {
                    msg.payload.On = payload.on;
                }

                return msg;
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
    RED.nodes.registerType("AnamicoChangeLight", AnamicoChangeLight);
};
