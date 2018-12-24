'use strict';

const async = require('async');
const convert = require('color-convert');

module.exports = function(RED) {

    function AnamicoLights(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.stateListeners = {};
        node.nodeId = node.id.replace(/\./g, '_');

        function sanitised(lightName) {
            return lightName.replace(/[^a-zA-Z0-9]/g, '_');
        }

        node.getLightState = function(lightName) {
            const safeName = sanitised(lightName);
            const json = node.context().global.get(node.nodeId + '_' + safeName);
            // todo: need a better initial default state?
            if (!json) {
                return {
                    on: false,
                    bri: 100
                };
            }
            try {
                const state = JSON.parse(json);
                node.log("getState: " + JSON.stringify(state, null, 2));
                return state;
            }
            catch (err) {
                node.log("getState json error: " + json);
            }
            return null;
        };

        node.setLightState = function(lightName, state) {
            const safeName = sanitised(lightName);
            const json = JSON.stringify(state);
            node.log("setState: " + json);
            node.context().global.set(node.nodeId + '_' + safeName, json);
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

             if (typeof msg.payload.on !== 'undefined') {
                 changed = msg.payload.on !== state.on;
                 state.on = msg.payload.on;
             }
             if (typeof msg.payload.reachable !== 'undefined') {
                 changed = changed || (msg.payload.reachable !== state.reachable);
                 state.reachable = msg.payload.reachable;
             }
             if (typeof msg.payload.bri !== 'undefined') {
                 changed = changed || (msg.payload.bri !== state.bri);
                 state.bri = msg.payload.bri;
             } else if (typeof msg.payload.brightness !== "undefined") {
                 changed = changed || (msg.payload.brightness !== state.bri);
                 state.bri = msg.payload.brightness;
             }

             //
             // rgb is highest priority
             // todo: fix up the "changed" check
             //
             if (typeof msg.payload.hex !== 'undefined') {
                 changed = true; //changed || (msg.payload.hex !== state.hex);
                 state.hex = msg.payload.hex;
                 // newState.rgb = convert.hex.rgb(newState.hex);
                 // newState.hsv = convert.hex.hsv(newState.hex);
             } else if (typeof msg.payload.rgb !== 'undefined') {
                 changed = true; // changed || (msg.payload.rgb !== state.rgb);
                 //newState.rgb = msg.payload.rgb;
                 state.hex = convert.rgb.hex(msg.payload.rgb);
                 //newState.hsv = convert.hex.hsv(newState.hex);
             } else if (typeof msg.payload.hsv !== 'undefined') {
                 changed = true; //changed || (msg.payload.hsv !== state.hsv); // todo: fix array comparison
                 //newState.hsv = msg.payload.hsv;
                 state.hex = convert.hsv.hex(msg.payload.hsv);
                 //newState.rgb = convert.hex.rgb(newState.hex);
             } else if (msg.payload.red || msg.payload.green || msg.payload.blue) {
                 var rgb = convert.hex.rgb(state.hex || 'FFFFFF');
                 if (msg.payload.red) {
                     rgb[0] = msg.payload.red;
                 }
                 if (msg.payload.green) {
                     rgb[1] = msg.payload.green;
                 }
                 if (msg.payload.blue) {
                     rgb[2] = msg.payload.blue;
                 }
                 state.hex = convert.rgb.hex(rgb);
             }

             delete state.rgb;
             delete state.hsv;

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
             callback(null, state);
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
                if (typeof msg.payload.on !== "undefined") {
                    changed = msg.payload.on !== state.on;
                    newState.on = msg.payload.on;
                }
                if (typeof msg.payload.reachable !== "undefined") {
                    changed = changed || (msg.payload.reachable !== state.reachable);
                    newState.reachable = msg.payload.reachable;
                }
                if (typeof msg.payload.bri !== "undefined") {
                    changed = changed || (msg.payload.bri !== state.bri);
                    newState.bri = msg.payload.bri;
                } else if (typeof msg.payload.brightness !== "undefined") {
                    changed = changed || (msg.payload.brightness !== state.bri);
                    newState.bri = msg.payload.brightness;
                }
                //
                // rgb is highest priority
                // todo: fix up the "changed" check
                //
                if (typeof msg.payload.hex !== 'undefined') {
                    changed = true; //changed || (msg.payload.hex !== state.hex);
                    newState.hex = msg.payload.hex;
                    // newState.rgb = convert.hex.rgb(newState.hex);
                    // newState.hsv = convert.hex.hsv(newState.hex);
                } else if (typeof msg.payload.rgb !== 'undefined') {
                    changed = true; // changed || (msg.payload.rgb !== state.rgb);
                    //newState.rgb = msg.payload.rgb;
                    newState.hex = convert.rgb.hex(msg.payload.rgb);
                    //newState.hsv = convert.hex.hsv(newState.hex);
                } else if (typeof msg.payload.hsv !== 'undefined') {
                    changed = true; //changed || (msg.payload.hsv !== state.hsv); // todo: fix array comparison
                    //newState.hsv = msg.payload.hsv;
                    newState.hex = convert.hsv.hex(msg.payload.hsv);
                    //newState.rgb = convert.hex.rgb(newState.hex);
                } else if (msg.payload.red || msg.payload.green || msg.payload.blue) {
                    var rgb = convert.hex.rgb(newState.hex || 'FFFFFF');
                    if (msg.payload.red) {
                        rgb[0] = msg.payload.red;
                    }
                    if (msg.payload.green) {
                        rgb[1] = msg.payload.green;
                    }
                    if (msg.payload.blue) {
                        rgb[2] = msg.payload.blue;
                    }
                    newState.hex = convert.rgb.hex(rgb);
                }

                if (typeof msg.payload.bri_add !== "undefined") {
                    changed = true;             // ???
                    newState.bri = newBrightness;
                }

                delete newState.rgb;
                delete newState.hsv;
                newState.duration = msg.payload.duration;

                memo[lightName] = newState;
                // todo: we don't save the new state here do we? I think we need to be careful we don't clobber events coming from the light itself.

                // tell all listeners about the new command for this light.
                const listeners = node.stateListeners[lightName] || {};
                Object.keys(listeners).map(function(key) { return listeners[key]; }).forEach(function(listener) {
                    listener({ payload: newState });
                });

                return memo;
            }, {});

            callback(null, lights);
        };
    }
    RED.nodes.registerType("AnamicoLights", AnamicoLights);
};


