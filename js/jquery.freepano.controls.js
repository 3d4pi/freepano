/*
 * freepano - WebGL panorama viewer
 *
 * Copyright (c) 2014 FOXEL SA - http://foxel.ch
 * Please read <http://foxel.ch/license> for more information.
 *
 *
 * Author(s):
 *
 *      Alexandre Kraft <a.kraft@foxel.ch>
 *
 *
 * Contributor(s):
 *
 *      Nils Hamel <n.hamel@foxel.ch>
 *
 *
 * This file is part of the FOXEL project <http://foxel.ch>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Additional Terms:
 *
 *      You are required to preserve legal notices and author attributions in
 *      that material or in the Appropriate Legal Notices displayed by works
 *      containing it.
 *
 *      You are required to attribute the work as explained in the "Usage and
 *      Attribution" section of <http://foxel.ch/license>.
 */


/**
 * Controls constructor
 */
function Controls(options) {

    if (!(this instanceof Controls))
        return new Controls(options);

    $.extend(true,this,this.defaults,options);
    this.init();

}

/**
 * Extends Controls prototype
 */
$.extend(true,Controls.prototype, {

    // default values
    defaults: {

        // keyboard
        keyboard: {
            move: {
                active: false,
                step: 0.5
            },
            zoom: {
                active: false,
                step: null  // value, or [null] meaning the same as panorama.camera.zoom.step
            }
        },

        // device motion
        devicemotion: {
            move: {
                active: false
            },
            internal: {
                ticks: {
                    nth: 5,
                    count: 0,   // [auto]
                    time: 0     // [auto]
                },
                orientation: {
                    lon: 0,     // [auto]
                    lat: 0      // [auto]
                },
                gravity: {
                    aligned: false,  // [auto]
                    sign: 1     // [auto] -1/+1 following device orientation
                }
            }
        }

    },

    // init() method
    init: function controls_init() {

        var controls = this;

        // orientation
        controls.orientation_detect();
        $(window).on('resize', function(e) {
            controls.orientation_detect();
        });

        // keyboard
        controls._init_keyboard();

        // devicemotion
        controls._init_devicemotion();

        // callback!
        controls.callback();

    },

    // panorama_init() method
    panorama_init: Panorama.prototype.init,

    // orientation
    orientation: {
        portrait: false,
        landscape: true,
    },

    // orientation_detect() method
    orientation_detect: function() {
        this.orientation.portrait = ($(window).width() < $(window).height());
        this.orientation.landscape = !this.orientation.portrait;
    },

    // gravity_alignment() method
    gravity_alignment: function() {

        this.devicemotion.internal.orientation.lon = 0; //todo!
        this.devicemotion.internal.orientation.lat = 0; //todo!

        // gravity set? todo!
        this.devicemotion.internal.gravity.aligned = true;

    },

    // [private] _init_keyboard() method
    _init_keyboard: function() {

        var controls = this;

        // keyboard move
        if (controls.keyboard.move.active)
            controls._register_keyboard_move(controls);

        // keyboard zoom
        if (controls.keyboard.zoom.active)
            controls._register_keyboard_zoom(controls);

        // watch keyboard move properties
        watch(controls.keyboard.move,['active'], function() {
            if (controls.keyboard.move.active)
                controls._register_keyboard_move(controls);
            else
                controls._unregister_keyboard_move(controls);
        });

        // watch keyboard zoom properties
        watch(controls.keyboard.zoom,['active'], function() {
            if (controls.keyboard.zoom.active)
                controls._register_keyboard_zoom(controls);
            else
                controls._unregister_keyboard_zoom(controls);
        });

    },

    // [private] _register_keyboard_move() method
    _register_keyboard_move: function(controls) {
        $(document).on('keydown',{controls: controls},controls._keyboard_move);
    },

    // [private] _unregister_keyboard_move() method
    _unregister_keyboard_move: function(controls) {
        $(document).off('keydown',controls._keyboard_move);
    },

    // [private] _register_keyboard_zoom() method
    _register_keyboard_zoom: function(controls) {
        $(document).on('keydown',{controls: controls},controls._keyboard_zoom);
    },

    // [private] _unregister_keyboard_zoom() method
    _unregister_keyboard_zoom: function(controls) {
        $(document).off('keydown',controls._keyboard_zoom);
    },

    // [private] _keyboard_move() method
    _keyboard_move: function(e) {

        var controls = e.data.controls;
        if (!controls.keyboard.move.active)
            return;

        var needDrawScene = true;
        var moveStep = controls.keyboard.move.step;

        // move
        switch(e.keyCode) {
            case 37:            // arrow left
                controls.panorama.lon -= moveStep;
                break;
            case 38:            // arrow top
                controls.panorama.lat -= moveStep;
                break;
            case 39:            // arrow right
                controls.panorama.lon += moveStep;
                break;
            case 40:            // arrow bottom
                controls.panorama.lat += moveStep;
                break;
            default:
                needDrawScene = false;
        }

        // update
        if (needDrawScene)
            controls.panorama.drawScene();

    },

    // [private] _keyboard_zoom() method
    _keyboard_zoom: function(e) {

        var controls = e.data.controls;
        if (!controls.keyboard.zoom.active)
            return;

        var needZoomUpdate = true;
        var zoomStep = controls.keyboard.zoom.step == null ?
            controls.panorama.camera.zoom.step : controls.keyboard.zoom.step;

        // zoom
        switch(e.keyCode) {
            case 107:           // [-] key
                controls.panorama.camera.zoom.current -= zoomStep;
                break;
            case 109:           // [+] key
                controls.panorama.camera.zoom.current += zoomStep;
                break;
            default:
                needZoomUpdate = false;
        }

        // update
        if (needZoomUpdate)
            controls.panorama.zoomUpdate();

    },

    // [private] _init_devicemotion() method
    _init_devicemotion: function() {

        var controls = this;

        // devicemotion move
        if (controls.devicemotion.move.active)
            controls._register_devicemotion_move(controls);

        // watch devicemotion move properties
        watch(controls.devicemotion.move,['active'], function() {
            if (controls.devicemotion.move.active)
                controls._register_devicemotion_move(controls);
            else
                controls._unregister_devicemotion_move(controls);
        });

    },

    // [private] _register_devicemotion_move() method
    _register_devicemotion_move: function(controls) {

        // pass controls
        window._controls_devicemotion = controls;

        // html5 device motion
        if (window.DeviceMotionEvent)
            window.addEventListener('devicemotion',controls._device_move_by_device_motion,false);

    },

    // [private] _unregister_devicemotion_move() method
    _unregister_devicemotion_move: function(controls) {

        // motion
        if (window.DeviceMotionEvent)
            window.removeEventListener('devicemotion',controls._device_move_by_device_motion,false);

        // reset time
        controls.devicemotion.internal.ticks.time = 0;

        // clear controls
        window._controls_devicemotion = null;

    },

    // [private] _device_move_by_device_motion() method
    _device_move_by_device_motion: function(e) {

        var controls = window._controls_devicemotion;
        if (!controls.devicemotion.move.active)
            return;

        // first tick
        if (controls.devicemotion.internal.ticks.time == 0) {

            // init time
            controls.devicemotion.internal.ticks.time = (new Date()).getTime();

            // gravity alignment
            controls.gravity_alignment();
            return;

        }

        // check for gravity alignment
        if (!controls.devicemotion.internal.gravity.aligned)
            return;

        // time
        var now = (new Date()).getTime();
        var elapsed = (now - controls.devicemotion.internal.ticks.time) / 1000;

        // original orientation
        var lon = controls.devicemotion.internal.orientation.lon;
        var lat = controls.devicemotion.internal.orientation.lat;

        // panorama orientation per device orientation
        if (controls.orientation.portrait) {
            lon -= controls.devicemotion.internal.gravity.sign * e.rotationRate.beta * elapsed;
            lat -= controls.devicemotion.internal.gravity.sign * e.rotationRate.alpha * elapsed;
        } else {
            lon += controls.devicemotion.internal.gravity.sign * e.rotationRate.alpha * elapsed;
            lat -= controls.devicemotion.internal.gravity.sign * e.rotationRate.beta * elapsed;
        }

        // assign orientation
        controls.panorama.lon = lon;
        controls.panorama.lat = lat;
        controls.devicemotion.internal.orientation.lon = lon;
        controls.devicemotion.internal.orientation.lat = lat;

        // store time
        controls.devicemotion.internal.ticks.time = now;

        // limit ticks rate
        controls.devicemotion.internal.ticks.count++;
        if (controls.devicemotion.internal.ticks.count <= controls.devicemotion.internal.ticks.nth)
            return;
        else
            controls.devicemotion.internal.ticks.count = 0;

        // moved? todo!
        var needDrawScene = true;

        // draw scene
        if (needDrawScene)
            controls.panorama.drawScene();

    }

});

/**
 * Extends Panorama prototype
 */
$.extend(Panorama.prototype, {

    // init() method
    init: function panorama_init() {

        var panorama = this;

        // controls defined in freepano options
        if (typeof panorama.controls !== 'undefined') {
            if (!(panorama.controls instanceof Controls)) {
                // convert options to instanciated class
                panorama.controls = new Controls($.extend(true,{
                    panorama: panorama,
                    callback: function() {
                        Controls.prototype.panorama_init.call(panorama);
                    }
                },panorama.controls));
            }
        } else {
            Controls.prototype.panorama_init.call(panorama);
        }

    }

});