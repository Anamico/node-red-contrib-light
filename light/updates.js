'use strict';

//const async = require('async');

module.exports = function(RED) {

    function AnamicoLightUpdates(config) {
        RED.nodes.createNode(this, config);
        this._lights = RED.nodes.getNode(config.lights);
        var node = this;

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


        });
    }
    RED.nodes.registerType("AnamicoLightUpdates", AnamicoLightUpdates);
};
