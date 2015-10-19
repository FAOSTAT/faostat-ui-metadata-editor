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

        /* Variables. */
        var source = $(templates).filter('#metadata_editor_structure').html(),
            template = Handlebars.compile(source),
            dynamic_data = {},
            html;

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Load structure. */
        html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).html(html);

        /* Load FAOSTAT tree. */
        this.tree = new Tree();
        this.tree.init({
            placeholder_id: 'tree_placeholder',
            code: 'QC',
            callback: {
                // Render Section
                onTreeRendered: function (arg) {
                    console.debug(arg);
                },
                onClick: function (callback) {
                    console.debug(callback);
                }
            }
        });

    };

    return APPLICATION;

});