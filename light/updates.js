'use strict';

const convert = require('color-convert');

module.exports = function(RED) {

    function AnamicoLightUpdates(config) {
        RED.nodes.createNode(this, config);
        this._lights = RED.nodes.getNode(config.lights);
        var node = this;

        node.lightNames = null;

        if (config.lightNames && config.lightNames.split) {
            node.lightNames = config.lightNames.split('\n').reduce(function(memo, name) {
                const trimmed = name.trim();
                if (trimmed.length > 0) {
                    memo.push(trimmed);
                }
                return memo;
            }, []);
        }

        /**
         *  Take commands to update a light or bank of lights
         *
         * lights :             list of lights              [ "light1", "light2", ... ]  // can set one, or a bank of lights
         * on :                 On/Off                      boolean
         * hue :                HUE                         (0-359)
         * sat / saturation :   Saturation                  (0-100%)
         * bri/brightness :     Brightness number           (0-100%)
         * red :                Red                         (0-255)
         * green :              Green                       (0-255)
         * blue :               Blue                        (0-255)
         * hex :                Hex color                   "aabbcc"
         * cr, mired or mirek : Mired temperature color     (153-500)
         * kelvin :             Kelvin temperature color    (2200-6500)
         * duration :           Transition time             (ms)
         */
        node.on('input', function(msg) {
            node.log(node);

            const lightNames = msg.payload.lights && Array.isArray(msg.payload.lights) && (msg.payload.lights.length > 0) ? msg.payload.lights : node.lightNames;
            const hueSwitch = (msg.info && msg.info.model && (msg.info.model.manufacturer === 'Philips') && (msg.info.model.type === 'ZLLSwitch')) || false;

            node.log(JSON.stringify({ lightNames: lightNames, hueSwitch: hueSwitch }, null, 2));

            if (!lightNames || lightNames.length < 1) {
                node.status({
                    fill:   "red",
                    shape:  "dot",
                    text:   "No Light Names supplied"
                });
                node.error("No Light Names supplied", msg);
                return;
            }
            if (hueSwitch) {
                handleHueSwitch(msg, lightNames);
                return;
            }

            node._lights.api(msg, lightNames, function(err, lights) {
                node.log(err);
                node.log(lights);
            });
        });

        /**
         * Special handling for hue switch commands
         */
        function handleHueSwitch(msg, lightNames) {
            switch (msg.payload.button) {
                case 1000:
                case 1001:
                case 1002:
                    msg.payload = { on: true, red: 255, green: 255, blue: 255, bri: 100 };
                    node.status({
                        fill:   'green',
                        shape:  'dot',
                        text:   'Hue: On'
                    });
                    break;

                case 2000:
                case 2001:
                case 2002:
                    msg.payload = { bri_add: 10, duration: 1000 };
                    node.status({
                        fill:   'blue',
                        shape:  'dot',
                        text:   'Hue: Brighten'
                    });
                    break;

                case 3000:
                case 3001:
                case 3002:
                    msg.payload = { bri_add: -10, duration: 1000 };
                    node.status({
                        fill:   'blue',
                        shape:  'dot',
                        text:   'Hue: Dim'
                    });
                    break;

                case 4000:
                case 4001:
                case 4002:
                    msg.payload = { on: false };
                    node.status({
                        fill:   'blue',
                        shape:  'dot',
                        text:   'Hue: Off'
                    });
                    break;

                case 1003:
                case 2003:
                case 3003:
                case 4003:
                    // ignore switch release
                    break;

                default:
                    node.status({
                        fill:   'grey',
                        shape:  'dot',
                        text:   'Unrecognized Hue Switch command'
                    });
                    node.error('Unrecognized Hue Switch command', msg);
                    return;
            }
            delete msg.info;
            node._lights.api(msg, lightNames, function(err, lights) {
                node.log(err);
                node.log(lights);
            });
        }
    }
    RED.nodes.registerType('AnamicoLightUpdates', AnamicoLightUpdates);
};
