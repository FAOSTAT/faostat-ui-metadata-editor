/*global define, console, JSONEditor, document*/
define(['jquery',
        'handlebars',
        'text!html/templates.hbs',
        'FAOSTAT_UI_TREE',
        'faostatapiclient',
        'swal',
        'q',
        'jsonEditor'], function ($, Handlebars, templates,
                                    Tree, FAOSTATAPIClient, swal, Q) {

    'use strict';

    function APPLICATION() {

        this.CONFIG = {
            lang: 'en',
            placeholder_id: 'placeholder',
            logged: false, /* TODO remove this! */
            url_metadata: 'http://faostat3.fao.org/mdfaostat/get/',
            callback: {},
            original_full_data: null,
            original_lite_data: null,
            edited_full_data: null,
            edited_lite_data: null,
            domain_id: null,
            url_get_metadata: 'http://faostat3.fao.org/mdfaostat/getmd/',
            url_get_domain: 'http://faostat3.fao.org/mdfaostat/getdomain/',
            editor_placeholder: 'editor_placeholder'
        };

    }

    APPLICATION.prototype.init = function (config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Initiate FAOSTAT API client. */
        this.CONFIG.api = new FAOSTATAPIClient();

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
        if (this.CONFIG.logged) {
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
            html = template(dynamic_data),
            that = this;
        $('#content_placeholder').html(html);

        /* Load FAOSTAT tree. */
        this.tree = new Tree();
        this.tree.init({
            placeholder_id: 'tree_placeholder',
            callback: {
                // Render Section
                onTreeRendered: function (arg) {
                    //console.debug('tree rendered! ' + arg);
                },
                onClick: function (callback) {
                    that.CONFIG.domain_id = callback.id;
                    that.load_metadata(callback.id);
                }
            }
        });

        /* Save Changes button. */
        $('#save_button').click(function () {
            if (that.CONFIG.domain_id !== null) {
                swal({
                    title: 'Are you sure?',
                    text: 'You are going to save your changes into the FAOSTAT database. The results will be visible on the production website.',
                    type: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#286090',
                    confirmButtonText: 'Yes, save it',
                    cancelButtonText: 'No',
                    closeOnConfirm: true,
                    closeOnCancel: true
                }, function (isConfirm) {
                    if (isConfirm) {
                        that.save();
                    }
                });
            } else {
                swal({
                    title: 'Error',
                    text: 'Please select a domain using the tree on the lefthand side of the screen.',
                    type: 'error'
                });
            }
        });

    };

    APPLICATION.prototype.load_metadata = function (id) {

        /* Variables. */
        var that = this,
            schema,
            data;

        /* Get metadata structure. */
        this.get_metadata_structure().then(function (response) {

            /* Cast response, if required. */
            if (typeof response === 'string') {
                response = $.parseJSON(response);
            }

            /* Create JSON schema. */
            schema = that.create_json_schema(response);

            /* Fetch data. */
            that.get_metadata().then(function (response) {

                /* Cast response, if required. */
                if (typeof response === 'string') {
                    response = $.parseJSON(response);
                }

                /* Create data. */
                data = that.create_data(response);

                /* Create JSON editor. */
                that.create_json_editor(schema, data);

            });

        });

    };

    APPLICATION.prototype.create_json_editor = function (schema, data) {

        /* Variables. */
        var div = $('#' + this.CONFIG.editor_placeholder),
            editor;

        /* Clear editor area. */
        div.empty();

        /* Init editor. */
        editor = new JSONEditor(document.getElementById(this.CONFIG.editor_placeholder), {
            schema: schema,
            theme: 'bootstrap3',
            iconlib: 'fontawesome4',
            disable_edit_json: true,
            disable_properties: true,
            collapsed: true,
            disable_array_add: true,
            disable_array_delete: true,
            disable_array_reorder: true,
            disable_collapse: false,
            remove_empty_properties: false,
            expand_height: true
        });
        editor.setValue(data);

        /* Remove unwanted labels. */
        div.find('div:first').find('h3:first').empty();
        div.find('div:first').find('p:first').empty();

        /* Collapse editor. */
        div.find('.btn.btn-default.json-editor-btn-collapse').click();

    };

    APPLICATION.prototype.create_data = function (metadata) {
        var data = {}, i, section;
        for (i = 0; i < metadata.length; i += 1) {
            section = parseInt(metadata[i].MetadataCode, 10);
            if (data[section] === undefined) {
                data[section] = {};
            }
            data[section][metadata[i].MetadataCode] = metadata[i].MetadataText;
        }
        return data;
    };

    APPLICATION.prototype.create_json_schema = function (metadata_structure) {

        /* Variables. */
        var schema, i, tmp, section;

        /* Create schema. */
        schema = {};
        schema.$schema = 'http://json-schema.org/draft-04/hyper-schema#';
        schema.type = 'object';
        schema.properties = {};

        /* Iterate over the metadata structure. */
        for (i = 0; i < metadata_structure.length; i += 1) {
            section = parseInt(metadata_structure[i].MetadataCode, 10);
            if (schema.properties[section] === undefined) {
                schema.properties[section] = {
                    type: 'object',
                    title: 'Section ' + section,
                    propertyOrder: section,
                    required: true,
                    properties: {}
                };
            }
            tmp = {};
            tmp.type = 'string';
            tmp.format = 'textarea';
            tmp.required = true;
            tmp.title = metadata_structure[i].Label;
            tmp.description = metadata_structure[i].Description;
            schema.properties[section].properties[metadata_structure[i].MetadataCode] = tmp;
        }

        /* Return the schema definition. */
        return schema;

    };

    APPLICATION.prototype.get_metadata_structure = function () {
        return Q($.ajax({
            url: this.CONFIG.url_get_metadata,
            type: 'GET'
        }));
    };

    APPLICATION.prototype.get_metadata = function () {
        return Q($.ajax({
            url: this.CONFIG.url_get_domain,
            type: 'GET',
            data: {
                domaincode: this.CONFIG.domain
            }
        }));
    };

    APPLICATION.prototype.save = function () {

    };

    APPLICATION.prototype.load_login_structure = function () {

        /* Load template. */
        var source = $(templates).filter('#login_structure').html(),
            template = Handlebars.compile(source),
            dynamic_data = {},
            html = template(dynamic_data),
            that = this;
        $('#content_placeholder').html(html);

        /* Enhance button. */
        $('#login_button').click(function () {
            that.login();
        });

    };

    APPLICATION.prototype.login = function () {
        var that = this;
        try {
            this.CONFIG.api.authentication({
                username: $('#username').val().toString(),
                password: $('#password').val().toString()
            }).then(function (response) {
                if (response.data.length > 0) {
                    that.CONFIG.logged = true;
                    that.load_metadata_editor_structure();
                } else {
                    swal('Error', 'Invalid username and/or password.', 'error');
                }
            });
        } catch (e) {

        }
    };

    return APPLICATION;

});