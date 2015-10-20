/*global define, console, JSONEditor, document*/
define(['jquery',
        'handlebars',
        'text!html/templates.hbs',
        'FAOSTAT_UI_TREE',
        'faostatapiclient',
        'swal',
        'FAOSTAT_THEME',
        'text!json/schema.json',
        'jsonEditor'], function ($, Handlebars, templates,
                                    Tree, FAOSTATAPIClient, swal,
                                    FAOSTAT_THEME, schema) {

    'use strict';

    function APPLICATION() {

        this.CONFIG = {
            lang: 'en',
            placeholder_id: 'placeholder',
            logged: true, /* TODO remove this! */
            url_metadata: 'http://faostat3.fao.org/d3s2/v2/msd/resources/metadata/uid'
        };

    }

    APPLICATION.prototype.init = function (config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Initiate FAOSTAT API client. */
        this.CONFIG.api = new FAOSTATAPIClient();

        /* Store JSON Schema. */
        this.CONFIG.schema = $.parseJSON(schema);

        /* Refactor schema. */
        this.CONFIG.schema = this.refactor_schema(this.CONFIG.schema);

        /* Apply FAOSTAT theme for json-editor. */
        JSONEditor.defaults.themes.faostat_theme = JSONEditor.AbstractTheme.extend(FAOSTAT_THEME);

        /* Extend string editor. */
        JSONEditor.defaults.editors.string = JSONEditor.defaults.editors.string.extend(this.custom_string_editor);

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
                    console.debug('rendered bitch! ' + arg);
                },
                onClick: function (callback) {
                    that.load_mdsd(callback.id);
                }
            }
        });

    };

    APPLICATION.prototype.load_mdsd = function (domain_id) {

        /* Variables. */
        var editor,
            container = $('#editor_placeholder');

        /* Clear message. */
        container.empty();

        /* Simplify OjCodeLists objects. */
        this.remove_OjCodeLists(this.CONFIG.schema);

        /* Initiate JSON editor. */
        editor = new JSONEditor(document.getElementById('editor_placeholder'), {
            schema: this.CONFIG.schema,
            theme: 'bootstrap3',
            iconlib: 'fontawesome4',
            disable_edit_json: true,
            disable_properties: true,
            collapsed: true,
            disable_array_add: false,
            disable_array_delete: false,
            disable_array_reorder: false,
            disable_collapse: false,
            remove_empty_properties: false,
            expand_height: true
        });

        /* Remove unwanted labels. */
        container.find('div:first').find('h3:first').empty();
        container.find('div:first').find('p:first').empty();

        /* Collapse editor. */
        container.find('.btn.btn-default.json-editor-btn-collapse').click();

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
            console.debug(e);
        }
    };

    APPLICATION.prototype.custom_string_editor = {

        setValue: function (value, initial, from_template) {

            var d,
                sanitized,
                changed;

            if (this.template && !from_template) {
                return;
            }

            if (value === null) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            } else if (typeof value !== 'string') {
                value = value.toString();
            }

            /* Convert milliseconds to valid date. */
            if (this.format === 'date') {
                try {
                    d = new Date(parseFloat(value));
                    value = d.toISOString().substring(0, 10);
                } catch (ignore) {

                }
            }

            if (value === this.serialized) {
                return;
            }

            /* Sanitize value before setting it */
            sanitized = this.sanitize(value);

            if (this.input.value === sanitized) {
                return;
            }

            this.input.value = sanitized;

            /* If using SCEditor, update the WYSIWYG */
            if (this.sceditor_instance) {
                this.sceditor_instance.val(sanitized);
            } else if (this.epiceditor) {
                this.epiceditor.importFile(null, sanitized);
            } else if (this.ace_editor) {
                this.ace_editor.setValue(sanitized);
            }

            changed = from_template || this.getValue() !== value;

            this.refreshValue();

            if (initial) {
                this.is_dirty = false;
            } else if (this.jsoneditor.options.show_errors === "change") {
                this.is_dirty = true;
            }

            if (this.adjust_height) {
                this.adjust_height(this.input);
            }

            /* Bubble this setValue to parents if the value changed */
            this.onChange(changed);

        }

    };

    APPLICATION.prototype.refactor_schema = function (json) {
        var section_regex = /[me]{2}[A-Z]/,
            properties = json.properties,
            key;
        json.properties.meIdentification = {};
        json.properties.meIdentification.propertyOrder = 1;
        json.properties.meIdentification.type = 'object';
        json.properties.meIdentification.title = 'IDENTIFICATION';
        json.properties.meIdentification.properties = {};
        for (key in properties) {
            if (!section_regex.test(key)) {
                if (key === 'title') {
                    json.properties.meIdentification.properties.title_fenix = json.properties[key];
                } else {
                    json.properties.meIdentification.properties[key] = json.properties[key];
                }
                delete json.properties[key];
            }
        }
        return json;
    };

    APPLICATION.prototype.remove_OjCodeLists = function (schema_property) {
        var i, p;
        /* Remove codelists. */
        if (schema_property.$ref !== undefined && schema_property.$ref === '#/definitions/OjCodeList') {
            schema_property.type = 'string';
            delete schema_property.$ref;
        }
        /* Add better header for array children. */
        if (schema_property.items !== undefined) {
            schema_property.items.headerTemplate ='{{i1}}';
        }
        /* Remove maps. */
        if (schema_property.patternProperties !== undefined) {
            schema_property.type = 'string';
            delete schema_property.patternProperties;
        }
        if (schema_property.properties !== undefined) {
            for (i = 0; i < Object.keys(schema_property.properties).length; i += 1) {
                p = schema_property.properties[Object.keys(schema_property.properties)[i]];
                this.remove_OjCodeLists(p);
            }
        }
    };

    return APPLICATION;

});