/*global define, console, JSONEditor, document*/
define(['jquery',
        'handlebars',
        'text!html/templates.hbs',
        'FAOSTAT_UI_TREE',
        'faostatapiclient',
        'swal',
        'FAOSTAT_THEME',
        'text!json/schema.json',
        'q',
        'jsonEditor'], function ($, Handlebars, templates,
                                    Tree, FAOSTATAPIClient, swal,
                                    FAOSTAT_THEME, schema, Q) {

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
            domain_id: null
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
                    //console.debug('tree rendered! ' + arg);
                },
                onClick: function (callback) {
                    that.CONFIG.domain_id = callback.id;
                    that.load_mdsd(callback.id);
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

    APPLICATION.prototype.save = function () {

        /* Variables. */
        var editor_value = this.CONFIG.editor.getValue(),
            that = this,
            i,
            key,
            value,
            merged,
            edited_lite_metadata,
            original_full_data,
            edited_full_data,
            fixed_keys;

        /* Refactor the output of the editor. */
        this.refactor_editor_output().then(function (response) {

            /* Metadata taken from the editor. */
            edited_lite_metadata = response;

            /* Get original full metadata. */
            that.get_original_full_metadata().then(function (response) {

                /* Store the original full metadata. */
                original_full_data = response;

                /* Convert the editor's output in full metadata. */
                that.lite2full(edited_lite_metadata).then(function (response) {

                    /* Store the full edited metadata. */
                    edited_full_data = response;
                    if (typeof edited_full_data === 'string') {
                        edited_full_data = $.parseJSON(edited_full_data);
                    }

                    /* Fix keys. */
                    fixed_keys = that.fix_keys_case(edited_full_data);

                    /* Merge metadata. */
                    merged = $.extend(true, {}, original_full_data, fixed_keys);

                    /* Update DB. */
                    that.update_db(merged).then(function (response) {
                        swal({
                            title: 'Info',
                            text: 'Your changes have been stored into the FAOSTAT database.',
                            type: 'info',
                            confirmButtonColor: '#286090',
                            confirmButtonText: 'Thank You',
                            closeOnConfirm: true
                        }, function (isConfirm) {
                            if (isConfirm) {
                                that.load_mdsd(that.CONFIG.domain_id);
                            }
                        });
                    });


                });

            });

        });


    };

    APPLICATION.prototype.update_db = function (edited_full_data) {
        var data = {
            lang: this.CONFIG.lang,
            domainCode: this.CONFIG.domain_id.toUpperCase(),
            MD: JSON.stringify(edited_full_data)
        };
        return Q($.ajax({
            url: 'http://faostat3.fao.org/mdfaostat/set/default.aspx',
            type: 'POST',
            data: data
        }));
    };

    APPLICATION.prototype.fix_keys_case = function (json) {
        var i, key, tmp;
        for (i = 0; i < Object.keys(json).length; i += 1) {
            key = Object.keys(json)[i];
            if (json[key] !== undefined && json[key] !== null) {
                if (typeof json[key] === 'object') {
                    tmp = this.fix_keys_case(json[key]);
                    json[key] = tmp;
                } else {
                    switch (key) {
                    case 'en':
                        json.EN = json.en;
                        delete json.en;
                        break;
                    case 'fr':
                        json.FR = json.fr;
                        delete json.fr;
                        break;
                    case 'es':
                        json.ES = json.es;
                        delete json.es;
                        break;
                    }
                }
            }
        }
        return json;
    };

    APPLICATION.prototype.lite2full = function (edited_lite_data) {
        return Q($.ajax({
            url: 'http://faostat3.fao.org/mdfaostat/getFullMD/default.aspx',
            type: 'POST',
            data: {
                lang: this.CONFIG.lang,
                liteMD: JSON.stringify(edited_lite_data)
            }
        }));
    };

    APPLICATION.prototype.get_original_full_metadata = function () {
        return Q($.ajax({
            url: this.CONFIG.url_metadata,
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: {
                lang: this.CONFIG.lang,
                domainCode: this.CONFIG.domain_id.toUpperCase(),
                type: 'full'
            }
        }));
    };

    APPLICATION.prototype.refactor_editor_output = function () {

        /* Variables. */
        var editor_value = this.CONFIG.editor.getValue(),
            i,
            key,
            value,
            that = this;

        return Q.fcall(function () {
            for (i = 0; i < Object.keys(editor_value.meIdentification).length; i += 1) {
                key = Object.keys(editor_value.meIdentification)[i];
                value = editor_value.meIdentification[key];
                editor_value[key] = value;
            }
            editor_value.title = editor_value.title_fenix;
            editor_value.creationDate = (new Date(editor_value.creationDate)).getTime();
            editor_value.meContent.seCoverage.coverageTime.from = (new Date(editor_value.meContent.seCoverage.coverageTime.from)).getTime();
            editor_value.meContent.seCoverage.coverageTime.to = (new Date(editor_value.meContent.seCoverage.coverageTime.to)).getTime();
            editor_value.meMaintenance.metadataLastCertified = (new Date(editor_value.meMaintenance.metadataLastCertified)).getTime();
            editor_value.meMaintenance.metadataLastPosted = (new Date(editor_value.meMaintenance.metadataLastPosted)).getTime();
            editor_value.meMaintenance.metadataLastUpdate = (new Date(editor_value.meMaintenance.metadataLastUpdate)).getTime();
            delete editor_value.meIdentification;
            delete editor_value.title_fenix;
            return editor_value;
        });

    };

    APPLICATION.prototype.load_mdsd = function (domain_id) {

        /* Variables. */
        var container = $('#editor_placeholder'),
            that = this;

        /* Clear message. */
        container.empty();

        /* Simplify OjCodeLists objects. */
        this.remove_OjCodeLists(this.CONFIG.schema);

        /* Initiate JSON editor. */
        this.CONFIG.editor = new JSONEditor(document.getElementById('editor_placeholder'), {
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

        /* Load data. */
        $.ajax({

            url: this.CONFIG.url_metadata,
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: {
                lang: this.CONFIG.lang,
                domainCode: domain_id.toUpperCase(),
                type: 'lite'
            },

            success: function (response) {

                /* Cast the result, if required. */
                that.CONFIG.original_lite_data = response;
                if (typeof that.CONFIG.original_lite_data === 'string') {
                    that.CONFIG.original_lite_data = $.parseJSON(response);
                }

                /* Populate editor. */
                that.populate_editor();

            },

            error: function (a) {
                swal({
                    title: 'Error',
                    type: 'error',
                    text: a.responseText
                });
            }

        });

    };

    APPLICATION.prototype.populate_editor = function () {

        /* Variables. */
        var section_regex,
            properties,
            key,
            container = $('#editor_placeholder');

        /* Display the editor... */
        if (this.CONFIG.original_lite_data !== undefined) {

            /* Regular expression test to reorganize metadata sections. */
            this.CONFIG.original_lite_data.meIdentification = {};
            section_regex = /[me]{2}[A-Z]/;
            properties = this.CONFIG.original_lite_data;
            for (key in properties) {
                if (!section_regex.test(key)) {
                    if (key === 'title') {
                        this.CONFIG.original_lite_data.meIdentification.title_fenix = this.CONFIG.original_lite_data[key];
                    } else {
                        this.CONFIG.original_lite_data.meIdentification[key] = this.CONFIG.original_lite_data[key];
                    }
                    delete this.CONFIG.original_lite_data[key];
                }
            }

            /* Populate the editor. */
            if (this.CONFIG.original_lite_data !== null) {
                this.CONFIG.editor.setValue(this.CONFIG.original_lite_data);
            }

            /* Collapse editor. */
            container.find('.btn.btn-default.json-editor-btn-collapse').click();

        }

        /* ...or a courtesy message. */
        else {
            this.display_courtesy_message();
        }

        /* Rendered. */
        this.CONFIG.rendered = true;

        /* Collapse editor. */
        container.find('.btn.btn-default.json-editor-btn-collapse').click();

        /* Invoke user function. */
        if (this.CONFIG.callback.onMetadataRendered) {
            this.CONFIG.callback.onMetadataRendered();
        }

    };

    /* TODO: Remove Map<String, String>. */
    APPLICATION.prototype.remove_OjCodeListsData = function (schema_property, key, father) {
        var i, p;
        if (schema_property.EN !== undefined) {
            father[key] = schema_property.EN;
        }
        if (schema_property.codes !== undefined && schema_property.codes[0] !== undefined) {
            if (schema_property.codes[0].label) {
                p = schema_property.codes[0].label.EN;
            } else {
                p = schema_property.codes[0].code;
            }
            father[key] = p;
        } else {
            for (i = 0; i < Object.keys(schema_property).length; i += 1) {
                if (typeof schema_property[Object.keys(schema_property)[i]] === 'object') {
                    this.remove_OjCodeListsData(schema_property[Object.keys(schema_property)[i]], Object.keys(schema_property)[i], schema_property);
                }
            }
        }
    };

    APPLICATION.prototype.apply_settings = function(data) {

        /* Apply application settings. */
        var blacklist = ['dsd', 'rid'];

        /* Filter by blacklist... */
        blacklist.forEach(function (setting) {
            try {
                delete data[setting.toString()];
            } catch (ignore) {

            }
        });

        return data;
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
                value = '' + value;
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
            schema_property.items.headerTemplate = '{{i1}}';
        }
        /* Remove maps. */
        if (schema_property.patternProperties !== undefined) {
            schema_property.type = 'string';
            delete schema_property.patternProperties;
        }
        /* Recursivity. */
        if (schema_property.properties !== undefined) {
            for (i = 0; i < Object.keys(schema_property.properties).length; i += 1) {
                p = schema_property.properties[Object.keys(schema_property.properties)[i]];
                this.remove_OjCodeLists(p);
            }
        }
    };

    return APPLICATION;

});