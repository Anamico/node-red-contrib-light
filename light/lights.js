'use strict';

const async = require('async');

module.exports = function(RED) {

    function AnamicoLights(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.stateListeners = {};
        node.nodeId = node.id.replace(/\./g, '_');

        node.getLightState = function(lightName) {
            node.context().global.get(node.nodeId + '_' + lightName); // todo: need an initial default state?
        };

        node.setLightState = function(lightName, state) {
            node.context().global.set(node.nodeId + '_' + lightName, state);
        };

        /**
         * track light state
         *
         * persist new light state if something changes it
         * this is ALREADY in node-red-contrib-node-lifx format from the listener node which will convert it from other formats
         * see: https://flows.nodered.org/node/node-red-contrib-node-lifx
         *
         * "payload": {
         *      "on": true,
         *      "reachable": true,
         *      "bri": 57,
         *      "hsv": [ 169, 37, 57 ],
         *      "rgb": [ 91, 145, 135 ],
         *      "hex": "5C9187",
         *      "color": "cadetblue",
         *      "kelvin": 2513,
         *      "mired": 397
         * },
         *
         * @param msg
         * @param callback
         */
         node.lightChanged = function(lightNode, msg, callback) {

             var state = node.getLightState(lightNode.name) || {};
             var changed = false;

             if (msg.payload.on) {
                 changed = msg.payload.on !== state.on;
                 state.on = msg.payload.on;
             }
             if (msg.payload.reachable) {
                 changed = changed || (msg.payload.reachable !== state.reachable);
                 state.reachable = msg.payload.reachable;
             }
             if (msg.payload.bri) {
                 changed = changed || (msg.payload.bri !== state.bri);
                 state.bri = msg.payload.bri;
             }
             if (msg.payload.hsv) {
                 changed = changed || (msg.payload.hsv !== state.hsv); // todo: fix array comparison
                 state.hsv = msg.payload.hsv;
             }
             if (msg.payload.rgb) {
                 changed = changed || (msg.payload.rgb !== state.rgb); // todo: fix array comparison
                 state.rgb = msg.payload.rgb;
             }
             if (msg.payload.hex) {
                 changed = changed || (msg.payload.hex !== state.hex);
                 state.hex = msg.payload.hex;
             }
             // todo: implement 'color' later?
             // if (msg.payload.color) {
             //     changed = changed || (msg.payload.on != state.on);
             //     state.on = msg.payload.on;
             // }
             // if (msg.payload.kelvin) {
             //     changed = changed || (msg.payload.on != state.on);
             //     state.on = msg.payload.on;
             // }
             // if (msg.payload.mired) {
             //     changed = changed || (msg.payload.on != state.on);
             //     state.on = msg.payload.on;
             // }

             if (changed) {
                 node.setLightState(lightNode.name, state);
                 msg.changed = changed;
             }
             callback(null, msg);
        };

        /**
         * Register a listener node to receive updates when the light changes (Single Light)
         *
         * @param node
         * @param callback
         */
        node.registerStateListener = function(listenerNode, callback) {
            var lightListeners = node.stateListeners[listenerNode.name] || {};
            lightListeners[listenerNode.id] = callback;
            node.stateListeners[listenerNode.name] = lightListeners;

            // also emit current state on registration (after delay of 100 msec?):
            // setTimeout(function() {
            //     const alarmState = node.context().global.get('SecuritySystemCurrentState_' + node.nodeId) || 0;
            //     const alarmType = node.context().global.get('SecuritySystemAlarmType_' + node.nodeId) || 0;
            //     const isAlarm = alarmState === 4;
            //     // node.log(alarmState);
            //     // node.log(alarmType);
            //     // node.log(isAlarm);
            //     callback({
            //         payload: {
            //             new light state
            //         }
            //     });
            // }, 100);
        };

        /**
         * Deregister an alarm state change listener
         *
         * @param node
         */
        node.deregisterStateListener = function(listenerNode) {
            node.log('deregister: ' + listenerNode.id);
            // remove it from ALL possible locations
            Object.keys(node.stateListeners).forEach(function(lightName) {
                node.stateListeners[lightName] && node.stateListeners[lightName][listenerNode.id] && delete node.stateListeners[lightName][listenerNode.id];
            });
        };


        /**
         * In response to an api call, we we make the changes to ALL lights as requested and notify them all
         * The state is persisted based on persistence of the global state.
         *
         * this accepts changes in node-red-contrib-node-lifx format with one additional field "lights", which identifies all the lights you wish to target
         * see: https://flows.nodered.org/node/node-red-contrib-node-lifx
         *
         * "payload": {
         *      "lights":   [ 'light1', 'light2', ... ],
         *      "on":       true/false,
         *      "red":      (0 - 255),
         *      "green":    (0 - 255),
         *      "blue":     (0 - 255),
         *      "hex":      "5C9187",
         *      "hue":      (0 - 360),
         *      "sat":      (0 - 100),    (or "saturation")
         *      "bri":      (0 - 100),    (percentage)
         *      "cr":       (153 - 500),  (or 'mired' or 'mirek' - Mired color temperature)
         *      "kelvin":   (2200-6500),  (kelvin colour temperature)
         *      "duration": (ms)          (transition time)
         * }
         *
         * PLUS we have incremental controls to "bump" the values from present. In this case, the first listed light is seen as the controller
         * "payload": {
         *     "bri_add":   +/- x% (eg -10) - this occurs over the given duration
         * }
         *
         * todo: more complex programming options, so transitions for each light in a set based on an algorithm, or as determined by the
         * "payload": {
         *     effect: "throb", "cycle", "march",
         *     decay: 1000 ms,
         *     maybe allow { lightname: { params }, lightname: {params} as well ?}??
         * }
         * @param msg
         * @param callback
         */
        node.api = function(msg, lightNames, callback) {

            if (!lightNames || !Array.isArray(lightNames)) {
                node.error("No Light Names supplied", msg);
                callback(new Error("No Light Names supplied"));
                return;
            }

            //
            // collect current light states
            //
            var brightness = -1;  // used for an incremental change
            var newBrightness = null;

            var lights = lightNames.reduce(function(memo, lightName) {
                const state = node.getLightState(lightName) || {};
                var changed = false;
                //
                // make the changes requested
                //
                if (msg.payload.bri_add && (brightness === -1)) {
                    // the first light dictates bank brightness
                    if (typeof state.bri === "undefined") {
                        // it's an error to have no brightness for the first light?
                        node.error('No brightness on first light to adjust', msg);
                        callback(new Error("No brightness on first light to adjust"));
                        return;
                    }
                    brightness = state.bri;
                    newBrightness = brightness + msg.payload.bri_add;
                    if (newBrightness > 100) {
                        newBrightness = 100;
                    }
                    if (newBrightness < 0) {
                        newBrightness = 0;
                    }
                }

                var newState = state;
                if (msg.payload.on) {
                    changed = msg.payload.on !== state.on;
                    newState.on = msg.payload.on;
                }
                if (msg.payload.reachable) {
                    changed = changed || (msg.payload.reachable !== state.reachable);
                    newState.reachable = msg.payload.reachable;
                }
                if (msg.payload.bri) {
                    changed = changed || (msg.payload.bri !== state.bri);
                    newState.bri = msg.payload.bri;
                }
                if (msg.payload.hsv) {
                    changed = changed || (msg.payload.hsv !== state.hsv); // todo: fix array comparison
                    newState.hsv = msg.payload.hsv;
                }
                if (msg.payload.rgb) {
                    changed = changed || (msg.payload.rgb !== state.rgb); // todo: fix array comparison
                    newState.rgb = msg.payload.rgb;
                }
                if (msg.payload.hex) {
                    changed = changed || (msg.payload.hex !== state.hex);
                    newState.hex = msg.payload.hex;
                }

                if (msg.payload.bri_add) {
                    changed = true;             // ???
                    newState.bri = newBrightness;
                }

                memo[lightName] = state;
                // todo: we don't save the new state here do we? I think we need to be careful we don't clobber events coming from the light itself.

                // tell all listeners about the new command for this light.
                const listeners = node.stateListeners[lightName] || {};
                Object.keys(listeners).map(function(key) { return listeners[key]; }).forEach(function(listener) {
                    listener({ payload: state });
                });
            }, {});

            callback(null, lights);
        };
    }
    RED.nodes.registerType("AnamicoLights", AnamicoLights);
};


