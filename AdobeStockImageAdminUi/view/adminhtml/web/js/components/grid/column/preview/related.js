/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */
define([
    'uiComponent',
    'underscore',
    'jquery',
    'mage/backend/tabs'
], function (Component, _, $) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'Magento_AdobeStockImageAdminUi/grid/column/preview/related',
            filterChipsProvider: 'componentType = filters, ns = ${ $.ns }',
            tabImagesLimit: 4,
            serieFilterValue: '',
            modelFilterValue: '',
            selectedTab: null,
            relatedImages: {
                series: {},
                model: {}
            },
            statefull: {
                serieFilterValue: true,
                modelFilterValue: true
            },
            modules: {
                chips: '${ $.chipsProvider }',
                filterChips: '${ $.filterChipsProvider }',
                preview: '${ $.parentName }.preview'
            },
            exports: {
                serieFilterValue: '${ $.provider }:params.filters.serie_id',
                modelFilterValue: '${ $.provider }:params.filters.model_id'
            }
        },

        /**
         * Init observable variables
         * @return {Object}
         */
        initObservable: function () {
            this._super()
                .observe([
                    'serieFilterValue',
                    'modelFilterValue',
                    'selectedTab',
                    'relatedImages'
                ]);

            return this;
        },

        /**
         * Check if related images are present for the record
         *
         * @param {Object} record
         * @returns boolean
         */
        isLoaded: function (record) {
            return this.getSeries(record).length || this.getModel(record).length;
        },

        /**
         * Get image related image series.s
         *
         * @param {Object} record
         */
        loadRelatedImages: function (record) {
            var series = this.getSeries(record),
                model = this.getModel(record);

            if (series && series.length ||
                model && model.length
            ) {
                return;
            }
            $.ajax({
                type: 'GET',
                url: this.preview().relatedImagesUrl,
                dataType: 'json',
                data: {
                    'image_id': record.id,
                    'limit': this.tabImagesLimit
                }
            }).done(function (data) {
                var relatedImages = this.relatedImages();

                relatedImages.series[record.id] = data.result['same_series'];
                relatedImages.model[record.id] = data.result['same_model'];
                this.relatedImages(relatedImages);
                this.preview().updateHeight();
            }.bind(this));
        },

        /**
         * Returns series to display under the image
         *
         * @param {Object} record
         * @returns {*[]}
         */
        getSeries: function (record) {
            return this.relatedImages().series[record.id] || [];
        },

        /**
         * Check if the number of related series image is greater than 4 or not
         *
         * @param {Object} record
         * @returns boolean
         */
        canShowMoreSeriesImages: function (record) {
            return this.getSeries(record).length >= this.tabImagesLimit;
        },

        /**
         * Returns model to display under the image
         *
         * @param {Object} record
         * @returns {*[]}
         */
        getModel: function (record) {
            return this.relatedImages().model[record.id] || [];
        },

        /**
         * Check if the number of related model image is greater than 4 or not
         *
         * @param {Object} record
         * @returns boolean
         */
        canShowMoreModelImages: function (record) {
            return this.getModel(record).length >= this.tabImagesLimit;
        },

        /**
         * Filter images from serie_id
         *
         * @param {Object} record
         */
        seeMoreFromSeries: function (record) {
            this.serieFilterValue(record.id);
            this.filterChips().set(
                'applied',
                {
                    'serie_id': record.id.toString()
                }
            );
        },

        /**
         * Filter images from serie_id
         *
         * @param {Object} record
         */
        seeMoreFromModel: function (record) {
            this.modelFilterValue(record.id);
            this.filterChips().set(
                'applied',
                {
                    'model_id': record.id.toString()
                }
            );
        },

        /**
         * Next related image preview
         *
         * @param {Object} record
         */
        nextRelated: function (record) {
            var relatedList = this.selectedTab() === 'series' ? this.getSeries(record) : this.getModel(record),
                nextRelatedIndex = _.findLastIndex(
                    relatedList,
                    {
                        id: this.preview().displayedRecord().id
                    }
                ) + 1,
                nextRelated = relatedList[nextRelatedIndex];

            if (typeof nextRelated === 'undefined') {
                return;
            }

            this.switchImagePreviewToRelatedImage(nextRelated);
        },

        /**
         * Previous related preview
         *
         * @param {Object} record
         */
        prevRelated: function (record) {
            var relatedList = this.selectedTab() === 'series' ? this.getSeries(record) : this.getModel(record),
                prevRelatedIndex = _.findLastIndex(
                    relatedList,
                    {
                        id: this.preview().displayedRecord().id
                    }
                ) - 1,
                prevRelated = relatedList[prevRelatedIndex];

            if (typeof prevRelated === 'undefined') {
                return;
            }

            this.switchImagePreviewToRelatedImage(prevRelated);
        },

        /**
         * Get previous button disabled
         *
         * @param {Object} record
         *
         * @return {Boolean}
         */
        cannotViewPrevious: function (record) {
            var relatedList, prevRelatedIndex, prevRelated;

            if (!this.selectedTab()) {
                return false;
            }
            relatedList = this.selectedTab() === 'series' ? this.getSeries(record) : this.getModel(record);
            prevRelatedIndex = _.findLastIndex(
                relatedList,
                {
                    id: this.preview().displayedRecord().id
                }
            ) - 1;
            prevRelated = relatedList[prevRelatedIndex];

            return typeof prevRelated === 'undefined';
        },

        /**
         * Get next button disabled
         *
         * @param {Object} record
         *
         * @return {Boolean}
         */
        cannotViewNext: function (record) {
            var relatedList, nextRelatedIndex, nextRelated;

            if (!this.selectedTab()) {
                return false;
            }
            relatedList = this.selectedTab() === 'series' ? this.getSeries(record) : this.getModel(record);
            nextRelatedIndex = _.findLastIndex(
                relatedList,
                {
                    id: this.preview().displayedRecord().id
                }
            ) + 1;
            nextRelated = relatedList[nextRelatedIndex];

            return typeof nextRelated === 'undefined';
        },

        /**
         * Switch image preview to related image
         *
         * @param {Object|null} relatedImage
         */
        switchImagePreviewToRelatedImage: function (relatedImage) {
            if (!relatedImage) {
                this.selectedTab(null);

                return;
            }

            if (this.preview().displayedRecord().id === relatedImage.id) {
                return;
            }

            this.preview().showRelated(relatedImage);
        },

        /**
         * Switch image preview to series image
         *
         * @param {Object} record
         */
        switchImagePreviewToSeriesImage: function (record) {
            this.selectedTab('series');
            this.switchImagePreviewToRelatedImage(record);
        },

        /**
         * Switch image preview to model image
         *
         * @param {Object} record
         */
        switchImagePreviewToModelImage: function (record) {
            this.selectedTab('model');
            this.switchImagePreviewToRelatedImage(record);
        }
    });
});
