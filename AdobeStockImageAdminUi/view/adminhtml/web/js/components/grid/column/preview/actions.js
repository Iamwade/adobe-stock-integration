// jscs:disable
/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
// jscs:enable
define([
    'uiComponent',
    'jquery',
    'Magento_AdobeStockImageAdminUi/js/model/messages',
    'Magento_AdobeStockImageAdminUi/js/media-gallery',
    'Magento_Ui/js/modal/confirm',
    'Magento_Ui/js/modal/prompt',
    'text!Magento_AdobeStockImageAdminUi/template/modal/adobe-modal-prompt-content.html'
], function (Component, $, messages, mediaGallery, confirmation, prompt, adobePromptContentTmpl) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Magento_AdobeStockImageAdminUi/grid/column/preview/actions',
            loginProvider: 'name = adobe-login, ns = adobe-login',
            mediaGallerySelector: '.media-gallery-modal:has(#search_adobe_stock)',
            adobeStockModalSelector: '#adobe-stock-images-search-modal',
            downloadImagePreviewUrl: 'adobe_stock/preview/download',
            licenseAndDownloadUrl: 'adobe_stock/license/license',
            saveLicensedAndDownloadUrl: 'adobe_stock/license/saveLicensed',
            confirmationUrl: 'adobe_stock/license/confirmation',
            buyCreditsUrl: 'https://stock.adobe.com/',
            messageDelay: 5,
            modules: {
                login: '${ $.loginProvider }',
                preview: '${ $.parentName }.preview',
                source: '${ $.provider }'
            }
        },

        /**
         * Returns is_downloaded flag as observable for given record
         *
         * @returns {observable}
         */
        isDownloaded: function () {
            return this.preview().displayedRecord()['is_downloaded'];
        },

        /**
         * Is asset licensed in adobe stock in context of currently logged in account
         *
         * @returns {observable}
         */
        isLicensed: function () {
            return this.preview().displayedRecord()['is_licensed'] && !this.isLicensedLocally();
        },

        /**
         * Is licensed version of asset saved locally
         *
         * @returns {observable}
         */
        isLicensedLocally: function () {
            return this.preview().displayedRecord()['is_licensed_locally'];
        },

        /**
         * Locate downloaded image in media browser
         */
        locate: function () {
            $(this.preview().adobeStockModalSelector).trigger('closeModal');
            mediaGallery.locate(this.preview().displayedRecord().path);
        },

        /**
         * Save preview
         */
        savePreview: function () {
            this.getPrompt(
                {
                    'title': $.mage.__('Save Preview'),
                    'content': $.mage.__('File Name'),
                    'visible': true,
                    'actions': {
                        confirm: function (fileName) {
                            this.save(this.preview().displayedRecord(), fileName);
                        }.bind(this)
                    },
                    'buttons': [{
                        text: $.mage.__('Cancel'),
                        class: 'action-secondary action-dismiss',

                        /**
                         * Close modal on button click
                         */
                        click: function () {
                            this.closeModal();
                        }
                    }, {
                        text: $.mage.__('Confirm'),
                        class: 'action-primary action-accept'
                    }]

                }
            );
        },

        /**
         * Save record as image
         *
         * @param {Object} record
         * @param {String} fileName
         * @param {bool} license
         * @param {bool} isLicensed
         */
        save: function (record, fileName, license, isLicensed) {
            var mediaBrowser = $(this.preview().mediaGallerySelector).data('mageMediabrowser'),
                requestUrl = isLicensed ? this.preview().saveLicensedAndDownloadUrl :
                    license ? this.preview().licenseAndDownloadUrl : this.preview().downloadImagePreviewUrl,
                destinationPath = (mediaBrowser.activeNode.path || '') + '/' + fileName + '.' +
                    this.getImageExtension(record);

            $.ajax({
                type: 'POST',
                url: requestUrl,
                dataType: 'json',
                showLoader: true,
                data: {
                    'media_id': record.id,
                    'destination_path': destinationPath
                },
                context: this,

                /**
                 * Success handler for Adobe Stock preview or licensed image
                 * download
                 *
                 */
                success: function () {
                    record['is_downloaded'] = 1;
                    record.path = destinationPath;

                    if (license || isLicensed) {
                        record['is_licensed'] = 1;
                        record['is_licensed_locally'] = 1;
                    }
                    this.preview().displayedRecord(record);
                    this.source().set('params.t ', Date.now());
                    $(this.preview().adobeStockModalSelector).trigger('closeModal');
                    mediaBrowser.reload(true);
                },

                /**
                 * Error handler for Adobe Stock preview or licensed image
                 * download
                 *
                 * @param {Object} response
                 */
                error: function (response) {
                    var message;

                    if (typeof response.responseJSON === 'undefined' ||
                        typeof response.responseJSON.message === 'undefined'
                    ) {
                        message = 'There was an error on attempt to save the image!';
                    } else {
                        message = response.responseJSON.message;
                    }
                    messages.add('error', message);
                    messages.scheduleCleanup(this.messageDelay);
                }
            });
        },

        /**
         * Generate meaningful name image file,
         * allow only alphanumerics, dashes, and underscores
         *
         * @param {Object} record
         * @return string
         */
        generateImageName: function (record) {
            var fileName = record.title.substring(0, 32)
                .replace(/[^a-zA-Z0-9_]/g, '-')
                .replace(/-{2,}/g, '-')
                .toLowerCase();

            /* If the filename does not contain latin chars, use ID as a filename */
            return fileName === '-' ? record.id : fileName;
        },

        /**
         * Get image file extension
         *
         * @param {Object} record
         * @return string
         */
        getImageExtension: function (record) {
            return record['content_type'].match(/[^/]{1,4}$/);
        },

        /**
         * Get messages
         *
         * @return {Array}
         */
        getMessages: function () {
            return messages.get();
        },

        /**
         * License and save image
         *s
         * @param {Object} record
         * @param fileName
         */
        licenseAndSave: function (record, fileName) {
            this.save(record, fileName, true);
        },

        /**
         * Shows license confirmation popup with information about current license quota
         *
         * @param {Object} record
         */
        showLicenseConfirmation: function (record) {
            var licenseAndSave = this.licenseAndSave.bind(this);

            $.ajax(
                {
                    type: 'POST',
                    url: this.preview().confirmationUrl,
                    dataType: 'json',
                    data: {
                        'media_id': record.id
                    },
                    context: this,
                    showLoader: true,

                    success: function (response) {
                        var confirmationContent = $.mage.__('License "' + record.title + '"'),
                            quotaMessage = response.result.message,
                            canPurchase = response.result.canLicense,
                            buyCreditsUrl = this.preview().buyCreditsUrl,
                            displayFieldName = !this.isDownloaded() ? '<b>' + $.mage.__('File Name') + '</b>' : '',
                            filePathArray = record.path.split('/'),
                            imageIndex = filePathArray.length - 1,
                            title = $.mage.__('License Adobe Stock Images?'),
                            cancelText = $.mage.__('Cancel'),
                            baseContent = '<p>' + confirmationContent + '</p><p><b>' + quotaMessage + '</b></p><br>';

                        if (canPurchase) {
                            this.getPrompt(
                                {
                                    'title': title,
                                    'content': baseContent + displayFieldName,
                                    'visible': !this.isDownloaded(),
                                    'actions': {
                                        confirm: function (fileName) {
                                            if (typeof fileName === 'undefined') {
                                                fileName = filePathArray[imageIndex]
                                                    .substring(0, filePathArray[imageIndex].lastIndexOf('.'));
                                            }
                                            licenseAndSave(record, fileName);
                                        }
                                    },
                                    'buttons': [{
                                        text: cancelText,
                                        class: 'action-secondary action-dismiss',
                                        click: function () {
                                            this.closeModal();
                                        }
                                    }, {
                                        text: $.mage.__('Confirm'),
                                        class: 'action-primary action-accept'
                                    }]

                                }
                            );
                        } else {
                            confirmation({
                                title: title,
                                content: baseContent,
                                buttons: [{
                                    text: cancelText,
                                    class: 'action-secondary action-dismiss',
                                    click: function () {
                                        this.closeModal();
                                    }
                                },{
                                    text: $.mage.__('Buy Credits'),
                                    class: 'action-primary action-accept',
                                    click: function () {
                                        window.open(buyCreditsUrl);
                                        this.closeModal();
                                    }
                                }]
                            });
                        }
                    },

                    error: function (response) {
                        messages.add('error', response.responseJSON.message);
                        messages.scheduleCleanup(this.messageDelay);
                    }
                }
            );
        },

        /**
         * Return configured  prompt with input field.
         */
        getPrompt: function (data) {
            var regex = new RegExp('[a-zA-Z0-9_-]');

            prompt({
                title: data.title,
                content:  data.content,
                value: this.generateImageName(this.preview().displayedRecord()),
                imageExtension: this.getImageExtension(this.preview().displayedRecord()),
                visible: data.visible,
                promptContentTmpl: adobePromptContentTmpl,
                modalClass: 'adobe-stock-save-preview-prompt',
                validation: true,
                promptField: '[data-role="adobe-stock-image-name-field"]',
                validationRules: ['required-entry'],
                attributesForm: {
                    novalidate: 'novalidate',
                    action: '',
                    onkeydown: 'return event.key != \'Enter\';'
                },
                attributesField: {
                    name: 'name',
                    'data-validate': '{required:true}',
                    maxlength: '128'
                },
                context: this,
                actions: data.actions,
                buttons: data.buttons
            });

            /* Allow only alphanumeric, dash, and underscore on filename input keypress */
            $('input[data-role="adobe-stock-image-name-field"]').bind('keypress', function (event) {
                var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);

                if (!regex.test(key)) {
                    event.preventDefault();

                    return false;
                }
            });
        },

        /**
         * Process of license
         */
        licenseProcess: function () {
            this.login().login()
                .then(function () {
                    this.showLicenseConfirmation(this.preview().displayedRecord());
                }.bind(this))
                .catch(function (error) {
                    messages.add('error', error.message);
                })
                .finally(function () {
                    messages.scheduleCleanup(this.messageDelay);
                }.bind(this));
        },

        /**
         * Save licensed
         *
         * @returns {void}
         */
        saveLicensed: function () {
            if (!this.login().user().isAuthorized) {
                return;
            }

            if (!this.isLicensed()) {
                return;
            }

            this.getPrompt(
                {
                    'title': $.mage.__('Save'),
                    'content': $.mage.__('File Name'),
                    'visible': true,
                    'actions': {
                        confirm: function (fileName) {
                            this.save(this.preview().displayedRecord(), fileName, false, true);
                        }.bind(this)
                    },
                    'buttons': [
                        {
                            text: $.mage.__('Cancel'),
                            class: 'action-secondary action-dismiss',

                            /**
                             * Close modal on button click
                             */
                            click: function () {
                                this.closeModal();
                            }
                        },
                        {
                            text: $.mage.__('Confirm'),
                            class: 'action-primary action-accept'
                        }
                    ]
                }
            );
        },

        /**
         * Returns license button title depending on the existing saved preview
         *
         * @returns {String}
         */
        getLicenseButtonTitle: function () {
            return this.isDownloaded() ?  $.mage.__('License') : $.mage.__('License and Save');
        }
    });
});
