/*global require*/
require([
    './submodules/fenix-ui-common/js/Compiler',
    './submodules/fenix-ui-common/js/paths',
    './submodules/faostat-ui-tree/src/js/paths',
    './submodules/faostat-ui-commons/js/paths',
    './submodules/json-editor-faostat-theme/src/js/paths'], function (Compiler, Common, Tree, FAOSTATCommons, FAOSTATTheme) {

    'use strict';

    var submodules_path = '../../submodules/',
        commonConfig = Common,
        treeConfig = Tree,
        faostatThemeConfig = FAOSTATTheme,
        faostatCommonsConfig = FAOSTATCommons;

    commonConfig.baseUrl = submodules_path + 'fenix-ui-common/js';
    treeConfig.baseUrl = submodules_path + '/faostat-ui-tree/src/js';
    faostatCommonsConfig.baseUrl = submodules_path + '/faostat-ui-commons/js';
    faostatThemeConfig.baseUrl = submodules_path + '/json-editor-faostat-theme/src/js';

    Compiler.resolve([commonConfig, treeConfig, faostatCommonsConfig, faostatThemeConfig],

        {
            placeholders: {
                'FENIX_CDN': '//fenixrepo.fao.org/cdn'
            },

            config: {

                baseUrl: './src/js',

                paths: {
                    bootstrap: '{FENIX_CDN}/js/bootstrap/3.3.4/js/bootstrap.min',
                    handlebars: '{FENIX_CDN}/js/handlebars/2.0.0/handlebars',
                    domReady: '{FENIX_CDN}/js/requirejs/plugins/domready/2.0.1/domReady',
                    i18n: '{FENIX_CDN}/js/requirejs/plugins/i18n/2.0.4/i18n',
                    text: '{FENIX_CDN}/js/requirejs/plugins/text/2.0.12/text',
                    faostatapiclient: '../js/FAOSTATAPIClient',
                    application: submodules_path + '../src/js/application',
                    swal: 'libs/sweet-alert',
                    jsonEditor: '{FENIX_CDN}/js/json-editor/0.7.22/jsoneditor.min',
                    html: '../html',
                    json: '../json'
                },

                shim: {
                    bootstrap: {
                        deps: ['jquery']
                    },
                    handlebars: {
                        exports: 'Handlebars'
                    },
                    faostatapiclient: {
                        deps: ['jquery']
                    }
                }
            }
        });

    /* Start the application. */
    require(['application'], function (Application) {

        var app = new Application();
        app.init();

    });

});