sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel,CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.VerbalManagement", {
        oNavVerbalManagementContainerName: "navContainerVerbalManagement",
        onInit: function () {
            console.log("VerbalManagement controller initialized");
        
        },

        onAfterRendering: function () {
            var that = this;
            var oNavContainer = that.getInfoModel().getProperty("/"+that.oNavVerbalManagementContainerName);
            if(!oNavContainer){
                oNavContainer = that.getView().byId("navContainerVerbalManagement");
                that.setNavContainer(that.oNavVerbalManagementContainerName, oNavContainer);
            }
            that.navToVerbalManagementHomeView(that.oNavVerbalManagementContainerName);
        }
    });
});
