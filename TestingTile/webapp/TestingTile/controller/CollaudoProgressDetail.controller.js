sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel,CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.CollaudoProgressDetail", {
        oCollaudoProgressDetailModel: new JSONModel(),
        oNavCollaudoProgressContainerName: "navContainerCollaudoProgress",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oCollaudoProgressDetailModel, "CollaudoProgressDetailModel");
            that.oCollaudoProgressDetailModel.setProperty("/editMode", false);
        },

        onAfterRendering: function () {
            var that = this;
        },
        onNavigateTo: function () {
			var that = this;
            let workcenters = that.getInfoModel().getProperty("/workcenters");
            let rowSelected =  that.getInfoModel().getProperty("/selectedCollaudoProgressRow");
            that.oCollaudoProgressDetailModel.setProperty("/workcenters", workcenters);
            that.oCollaudoProgressDetailModel.setProperty("/editMode", false);
            that.oCollaudoProgressDetailModel.setProperty("/selectedCollaudoProgressRow", rowSelected);
            that.oCollaudoProgressDetailModel.setProperty("/selectedTreeTableRow", undefined);
            that.oCollaudoProgressDetailModel.setProperty("/doRelease",false);
			that.loadTreeTable();
		},
        onRowSelectionChange: function(oEvent){
            var that=this;
            var oTreeTable = oEvent.getSource();
            var iSelectedIndex = oTreeTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTreeTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                that.oCollaudoProgressDetailModel.setProperty("/selectedTreeTableRow", oSelectedData);
            } else{
                that.oCollaudoProgressDetailModel.setProperty("/selectedTreeTableRow", undefined);
            }
        },
        loadTreeTable: function(){
            var that=this;

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getCollaudoProgressTreeTable";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedCollaudoProgressRow/order");

            let params = {
                plant: plant,
                order: order
            };

            var successCallback = function(response) {
                that.oCollaudoProgressDetailModel.setProperty("/BusyLoadingOpTable", false);
                that.oCollaudoProgressDetailModel.setProperty("/treeData", response);
            };
            
            var errorCallback = function(error) {
                that.oCollaudoProgressDetailModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oCollaudoProgressDetailModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);
        },
        statusIcon: function(oStatus){
            switch (oStatus) {
                case "New":
                    return "sap-icon://color-fill";
                case "Done":
                    return "sap-icon://complete";
                case "In Work":
                    return "sap-icon://circle-task-2";
                case "Active":
                    return "sap-icon://circle-task-2";
                case "In Queue":
                    return "sap-icon://color-fill";
                default:
                    return "";
            }
        },
        statusColor: function(oStatus){
            switch (oStatus) {
                case "New":
                    return "blue";
                case "Done":
                    return "green";
                case "In Work":
                    return "green";
                case "Active":
                    return "green";
                case "In Queue":
                    return "blue";
                default:
                    return "";
            }
        },
        // Espandi tutti i nodi
        onExpandAll: function() {
            var oTreeTable = this.getView().byId("CollaudoProgressTreeTable");
            oTreeTable.expandToLevel(10);
        },
        // Collassa tutti i nodi
        onCollapseAll: function() {
            var oTreeTable = this.getView().byId("CollaudoProgressTreeTable");
            oTreeTable.collapseAll();
        },
        onNavBack: function(){
            var that=this;
            that.navToCollaudoProgressHomeView(that.oNavCollaudoProgressContainerName);
        },
    });
});
