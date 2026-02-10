sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utilities/CommonCallManager"
], function (BaseController, JSONModel, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.CollaudoProgressHome", {
        oCollaudoProgressModel: new JSONModel(),
        oNavCollaudoProgressContainerName: "navContainerCollaudoProgress",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oCollaudoProgressModel, "CollaudoProgressModel");
        },

        onAfterRendering: function () {
            var that=this;
            that.getFilters();
        },
        onNavigateTo: function(){
            var that = this;
		},
        onRowSelectionChange: function(oEvent) {
            var that = this;
            var oTable = oEvent.getSource();
            var iSelectedIndex = oTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                that.getInfoModel().setProperty("/selectedCollaudoProgressRow", oSelectedData);
                that.navToCollaudoProgressDetailView(that.oNavCollaudoProgressContainerName);
            } else{
                that.getInfoModel().setProperty("/selectedCollaudoProgressRow", undefined);
            }
        },
        onSearchPress: function(){
            var that=this;
            that.loadData();
        },
        onClearPress: function() {
            var oView = this.getView();
            oView.byId("projectCollaudoProgressFilter").setSelectedKey('');
            oView.byId("sfcCollaudoProgressFilter").setSelectedKey('');
            oView.byId("coCollaudoProgressFilter").setSelectedKey('');
            oView.byId("customerCollaudoProgressFilter").setSelectedKey('');
            oView.byId("projectCollaudoProgressFilter").setValue("");
            oView.byId("sfcCollaudoProgressFilter").setValue("");
            oView.byId("coCollaudoProgressFilter").setValue("");
            oView.byId("customerCollaudoProgressFilter").setValue("");
            oView.byId("sentToInstallationCollaudoProgress").setSelected(false);
            oView.byId("showAllCollaudoProgress").setSelected(false);
            
            var oTable = oView.byId("CollaudoProgressTable");
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter([]);
            }
        },
        getFilters: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/api/getFilterFinalCollaudo";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant
            };

            var successCallback = function(response) {
                that.oCollaudoProgressModel.setProperty("/", response);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata getFilters  fallita CollaudoPorgress:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
        },
        loadData: function(){
            var that=this;
            let project = that.byId("projectCollaudoProgressFilter").getSelectedKey();
            let sfc = that.byId("sfcCollaudoProgressFilter").getSelectedKey();
            let co = that.byId("coCollaudoProgressFilter").getSelectedKey();
            let customer = that.byId("customerCollaudoProgressFilter").getSelectedKey();

            let showAllSfcStatus = that.byId("showAllCollaudoProgress").getSelected(); 
            let sentToInstallation = that.byId("sentToInstallationCollaudoProgress").getSelected(); 

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getFinalCollaudoData";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
                project: project,
                co: co,
                sfc: sfc,
                customer: customer,
                sentToInstallation,
                showAllSfcStatus: showAllSfcStatus
            };

            var successCallback = function(response) {
                that.oCollaudoProgressModel.setProperty("/BusyLoadingOpTable", false);
                that.oCollaudoProgressModel.setProperty("/tableData", response);
            };
            
            var errorCallback = function(error) {
                that.oCollaudoProgressModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oCollaudoProgressModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);


        },
        statusIcon: function(sfcStatus){
            switch (sfcStatus) {
                case "NEW":
                    return "sap-icon://rhombus-milestone-2";
                case "DONE":
                    return "sap-icon://complete";
                case "IN_WORK":
                    return "sap-icon://circle-task-2";
                case "ACTIVE":
                    return "sap-icon://circle-task-2";
                case "IN_QUEUE":
                    return "sap-icon://color-fill";
                default:
                    return "";
            }
        },
        statusColor: function(sfcStatus){
            switch (sfcStatus) {
                case "NEW":
                    return "grey";
                case "DONE":
                    return "green";
                case "IN_WORK":
                    return "green";
                case "ACTIVE":
                    return "green";
                case "IN_QUEUE":
                    return "blue";
                default:
                    return "";
            }
        },
    });
});
