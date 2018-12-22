# node-red-contrib-light
[![Donate](https://img.shields.io/badge/donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JUYN6NBFELTC2&source=url)

Powerful and flexible node-red nodes to enable you to build your own home lighting controllers with any number of lights, areas and automations.
Designed to be easily extensible with other controllers (see below) to automate all types of scenes and effects.

The primary reason this node set was created was to easily control any automated lights using the Hue Dimmer Light Switch.

![Basic Example](https://github.com/Anamico/node-red-contrib-light/raw/master/images/basic.png "Basic Example")

There is 1 configuration node and 3 flow node types currently provided:
1. Lights (Configuration node)
2. ChangeLight node
3. LightChanged node
4. Updates node

# How it works

These nodes are designed to work in a fairly simple way.

Firstly, you need to have at least 1 configuration node. This represents a collection or grouping of lights. It normally works fine to just create one of these for all
lights in your entire property. It acts as a centralised controller persisting state and distributing commands to all your lights, attempting to keep state current and in sync across what you see
and what you expect to see.

The Basic usage is to hook up a hue switch to the Updates node, and have your lights connected to the LightChanged and ChangeLight nodes. This will essentially let you control and dim any lights
using a hue light switch (In our case, we wanted to control a bank of LIFX lights with a hue dimmer).

The interesting thing though is the Updates node accepts complex instructions and can be extended by using pre-made visual effects on any groupings of lights (see below for ideas and links).

## Node Descriptions

Create a Lights configuration node to manage lights. So for a normal house where everything is meant to work together, just create one of these nodes to manage all the lights.

## ChangeLight

The "ChangeLight" node is designed to accept a state update message from a light globe. This node interprets the new state, and persists that state for you, so any action you then perform
on that light will be relative to the real current state.

For example, setting the mode as "LIFX" and connecting the output from a node-red-contrib-node-lifx node-lifx-out node will have the internal state of the light track and remain in
sync with that physical light.

![LIFX Example](https://github.com/Anamico/node-red-contrib-light/raw/master/images/lifxLight.png "LIFX Example")

"Default" or "LIFX" modes will expect payloads in node-red-contrib-node-lifx message format. Currently "Hue" mode is also supported and accepts and decodes messages from
node-red-contrib-huebridge light globe nodes.

You can easily support other lights by "massaging" the msg.payload output from that light to one of those 2 formats. If you need a specific format, please feel free to visit the github repo,
request the light message format or fork the repo add it and submit a pull request.

NOTE: the "Name" of the node is critical, this is the name used to identify this particular light, name it carefully and exactly as you would like to refer to it at any time. Each light needs
to be connected to nodes with a specific name for that precise light, do not attach multiple lights to nodes with the same name, it will NOT work.

Make sure you also select the right "mode" in the node configuration:

* Default - Same as LIFX format
* Hue - compatible with messages from node-red-contrib-huebridge light globe nodes (node-lifx-out)
* LIFX - compatible with messages from node-red-contrib-node-lifx light globe nodes (hue-light)

## LightChanged

This node emits a message when node-red-contrib-light deems it necessary to direct a light to change, such as switching a light on or off, changing colour, brightness or performing any other action.

The payload will be in either node-red-contrib-node-lifx (default) format, or in node-red-contrib-huebridge format, depending on the mode configured for this node.

To control a hue light globe for instance, connect it like this:

![Hue Example](https://github.com/Anamico/node-red-contrib-light/raw/master/images/hueLight.png "Hue Example")

note that the output for the hue light is also fed back to the ChangeLight node to keep the light and node-red-contrib-light states in sync.

NOTE: the "Name" of the node is critical, this is the name used to identify this particular light, name it carefully and exactly as you would like to refer to it at any time. Each light needs
to be connected to nodes with a specific name for that precise light, do not attach multiple lights to nodes with the same name, it will NOT work.

Make sure you also select the right "mode" in the node configuration:

* Default - Same as LIFX format
* Hue - compatible with messages from node-red-contrib-huebridge light globe nodes (node-lifx-out)
* LIFX - compatible with messages from node-red-contrib-node-lifx light globe nodes (hue-light)

## Updates

The Updates node is really the controller and the API for the whole system. The 2 nodes above (LightChanged and ChangeLight) are designed to control and react to the light state in the physical world
so if you use a homekit, alexa or some other control for the light, the state in this system will remain in sync. And if you make changes via this update mechanism, they are sent to the light.

This Updates node accepts a slightly modified version of the node-red-contrib-node-lifx light format. Please refer to that node for the payload contents.
On top of those fields, there are 2 additional payload fields that are both optional.

The first optional field is "lightNames", this field accepts an array of names of lights that need to be changed to match the instruction. ie: ["Lounge1", "Lounge2", ... ]. If this is NOT present, it will use
the list of lights in the configuration of this node. But note there MUST be a list in one of those locations or the node will throw an error as it has no idea what lights you are wanting to change.

![Names Example](https://github.com/Anamico/node-red-contrib-light/raw/master/images/names.png "Names Example")

The Second optional field is "bri_add". This is a positive/negative percentage as a number (ie: -10 means dim by 10% of full brightness). If you try and brighten or dim the light outside of 0 to 100%,
the range is automatically limited.

NOTE: This node will AUTO-DETECT a message from a node-red-contrib-huebridge light switch node and react to on, off, dim and brighten button presses (but not long-presses and double-taps, etc).
I am looking at what else I can build in to automate with those instructions, but this covers basic operations. We probably should make new nodes to cope with more complex interactions really.

![Switch Example](https://github.com/Anamico/node-red-contrib-light/raw/master/images/switch.png "Switch Example")


# Extension and Compatible Nodes

node-red-contrib-light is designed to accept standard calls from a variety of nodes to allow any sort of visual effects:

* [node-red-contrib-light-fx](https://github.com/Anamico/node-red-contrib-light-fx)
* [node-red-contrib-light-airtunes](https://github.com/Anamico/node-red-contrib-light-airtunes)

If you create some more automations or effects as reusable nodes, please update this README and submit a pull request.


# Donations [![Donate](https://img.shields.io/badge/donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JUYN6NBFELTC2&source=url)

If you would like to donate some money to support ongoing development or as a simple thank you for me sharing this project for others to use, please feel free to send money via
[PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JUYN6NBFELTC2&source=url).


# NOTE

This is built to work best with [node-red-contrib-node-lifx](https://www.npmjs.com/package/node-red-contrib-node-lifx), the reason I don't use node-red-contrib-lifx2
or variants is they don't update the light state when the light changes from some other source, and this library is dependent on being kept up to date with the actual physical state of the lights.

But I have had an issue with colours not setting correctly using node-red-contrib-node-lifx, which is apparently related to the dependency node-lifx not having been updated in some time.

The current "fix" is to update the node-lifx lib file "products.json" with the [latest version from the laster branch](https://github.com/LIFX/products/blob/master/products.json)

This was the explanation from the author:

> In short, it's an issue with the node-life dependency, not the node-red-contrib-node-lifx package itself.
>
> The node-life package (https://github.com/MariusRumpf/node-lifx) hasn't been updated in about a year, but LIFX has released new products since its last update. You could open an issue on that package, but that's really what we're waiting on. I'm just happy this package works with the minor modification. Until node-lifx updates, doing an npm install of this package will always give you the "current" node-lifx, and thus the outdated product list.
>
> I run my home lighting system on a Raspberry Pi and just keep a copy of the current products.json on the desktop, as I have to replace it if I ever need to reinstall, but it does work reliably. In my case, the missing products are my new LIFX mini bulbs, but my code always acts funny if I forget to update the products.json file, so that would seem to be the clear problem.
>
> So it's definitely fiddly, but at least it works!


# Disclaimer

Of course, this software is completely opensource and offered with absolutely NO WARRANTY whatsoever offered or implied.

If you choose to set up your own lighting system, and your house burns to the ground, it's your problem, nothing to do with this software as there is no warranty
 whatsoever. Up to you to use it completely at your own risk. So YOU HAVE BEEN WARNED!