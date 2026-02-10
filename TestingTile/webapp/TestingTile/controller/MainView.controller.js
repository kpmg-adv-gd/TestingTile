sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager"
], function (jQuery, JSONModel, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.TestingTile.TestingTile.TestingTile.controller.MainView", {
		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);
		},

		onBeforeRenderingPlugin: function () {
		},
        handleIconTabBarSelect: function(oEvent) {

		},

        onAfterRendering: function(){
            var that=this;
        },
	});
});