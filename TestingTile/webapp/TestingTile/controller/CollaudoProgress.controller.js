sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel, Filter, FilterOperator, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.CollaudoProgress", {
        oNavCollaudoProgressContainerName: "navContainerCollaudoProgress",
        onInit: function () {
            var that=this;
        },

        onAfterRendering: function () {
            var that = this;
            var oNavContainer = that.getInfoModel().getProperty("/"+that.oNavCollaudoProgressContainerName);
            if(!oNavContainer){
                oNavContainer = that.getView().byId("navContainerCollaudoProgress");
                that.setNavContainer(that.oNavCollaudoProgressContainerName, oNavContainer);
            }
            that.navToCollaudoProgressHomeView(that.oNavCollaudoProgressContainerName);
        },

    });
});
