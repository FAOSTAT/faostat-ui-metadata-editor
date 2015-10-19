/*global define, console*/
define(['jquery'], function ($) {

    'use strict';

    function APPLICATION() {

        this.CONFIG = {
            lang: 'en'
        };

    }

    APPLICATION.prototype.init = function (config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        console.debug(this.CONFIG);

    };

    return APPLICATION;

});