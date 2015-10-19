/*global require, document*/
require.config({

    baseUrl: 'src/js/libs',

    paths: {

        bootstrap: '//fenixrepo.fao.org/cdn/js/bootstrap/3.3.4/js/bootstrap.min',
        handlebars: '//fenixrepo.fao.org/cdn/js/handlebars/2.0.0/handlebars',
        domReady: '//fenixrepo.fao.org/cdn/js/requirejs/plugins/domready/2.0.1/domReady',
        i18n: '//fenixrepo.fao.org/cdn/js/requirejs/plugins/i18n/2.0.4/i18n',
        text: '//fenixrepo.fao.org/cdn/js/requirejs/plugins/text/2.0.12/text',

        APPLICATION: '../application'
    },

    shim: {
        q: {
            deps: ['jquery'],
            exports: 'q'
        },
        bootstrap: {
            deps: ['jquery']
        },
        handlebars: {
            exports: 'Handlebars'
        }
    }

});

require(['APPLICATION'], function (APPLICATION) {

    'use strict';

    var app = new APPLICATION();
    app.init();

});