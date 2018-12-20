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
         * listen for panel state changes
         */
        node._lights && node._lights.registerStateListener(node, function(msg) {

            node.status({
                fill:   msg.payload.on ? "green" : "gray",
                shape:  "dot",
                text:   msg.payload.on ? (msg.payload.luminance ? ((msg.payload.luminance/100) * 100).toFixed(2) + '%' : 'on') : 'off'
            });
            // reformat the command to match the type of light
            if ((['Basic','LIFX'].indexOf(config.mode) > -1) && (typeof msg.payload.hex !== 'undefined')) {
                const hsl = convert.hex.hsv(msg.payload.hex);
                msg.payload.hue = hsl[0];
                msg.payload.sat = hsl[1];
                msg.payload.bri = hsl[2];
                delete msg.payload.hex;
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
