/*global define, console*/
define(['jquery',
        'handlebars',
        'text!html/templates.hbs',
        'FAOSTAT_UI_TREE'], function ($, Handlebars, templates, Tree) {

    'use strict';

    function APPLICATION() {

        this.CONFIG = {
            lang: 'en',
            placeholder_id: 'placeholder'
        };

    }

    APPLICATION.prototype.init = function (config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Variables. */
        var source = $(templates).filter('#main_structure').html(),
            template = Handlebars.compile(source),
            dynamic_data = {
                logged: false
            },
            html;

        /* Load structure. */
        html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).html(html);

        /* Check whether the user is logged in, load the login otherwise. */
        if (this.isLogged()) {
            this.load_metadata_editor_structure();
        } else {
            this.load_login_structure();
        }

    };

    APPLICATION.prototype.load_metadata_editor_structure = function () {

        /* Load main structure. */
        var source = $(templates).filter('#metadata_editor_structure').html(),
            template = Handlebars.compile(source),
            dynamic_data = {},
            html = template(dynamic_data);
        $('#content_placeholder').html(html);

        /* Load FAOSTAT tree. */
        this.tree = new Tree();
        this.tree.init({
            placeholder_id: 'tree_placeholder',
            callback: {
                // Render Section
                onTreeRendered: function (arg) {
                    console.debug('rendered bitch');
                },
                onClick: function (callback) {
                    console.debug(callback);
                }
            }
        });

    };

    APPLICATION.prototype.load_login_structure = function () {
        var source = $(templates).filter('#login_structure').html(),
            template = Handlebars.compile(source),
            dynamic_data = {},
            html = template(dynamic_data);
        $('#content_placeholder').html(html);
    };

    APPLICATION.prototype.isLogged = function () {
        return true;
    };

    return APPLICATION;

});