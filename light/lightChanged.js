'use strict';

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
                fill:   msg.payload.on ? "green" : "gray",
                shape:  "dot",
                text:   msg.payload.on ? (msg.payload.bri < 100 ? ((msg.payload.bri/100) * 100).toFixed(0) + '%' : 'on') : 'off'
            });

            node._lights.lightChanged(node, msg, function(err, state) {
                node.log({ node: "LightChanged", err: err, state: state });
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
    RED.nodes.registerType("AnamicoLightChanged", AnamicoLightChanged);
};
