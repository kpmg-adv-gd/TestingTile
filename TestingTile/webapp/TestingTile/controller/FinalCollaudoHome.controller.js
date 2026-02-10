sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utilities/CommonCallManager"
], function (BaseController, JSONModel, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.FinalCollaudoHome", {
        oFinalCollaudoModel: new JSONModel(),
        oNavFinalCollaudoContainerName: "navContainerFinalCollaudo",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oFinalCollaudoModel, "finalCollaudoModel");
        },

        onAfterRendering: function () {
            var that=this;
            that.getFilters();
        },
        onNavigateTo: function(){
            var that = this;
            that.loadData();
		},
        onRowSelectionChange: function(oEvent) {
            var that = this;
            var oTable = oEvent.getSource();
            var iSelectedIndex = oTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                that.getInfoModel().setProperty("/selectedFinalCollaudoRow", oSelectedData);
                that.navToFinalCollaudoDetailView(that.oNavFinalCollaudoContainerName);
            } else{
                that.getInfoModel().setProperty("/selectedFinalCollaudoRow", undefined);
            }
        },
        onSearchPress: function(){
            var that=this;
            that.loadData();
        },
        onClearPress: function() {
            var oView = this.getView();
            oView.byId("projectFinalCollaudoFilter").setSelectedKey('');
            oView.byId("sfcFinalCollaudoFilter").setSelectedKey('');
            oView.byId("coFinalCollaudoFilter").setSelectedKey('');
            oView.byId("customerFinalCollaudoFilter").setSelectedKey('');
            oView.byId("projectFinalCollaudoFilter").setValue("");
            oView.byId("sfcFinalCollaudoFilter").setValue("");
            oView.byId("coFinalCollaudoFilter").setValue("");
            oView.byId("customerFinalCollaudoFilter").setValue("");
            oView.byId("sentToInstallationFinalCollaudo").setSelected(false);
            oView.byId("showAllfinalCollaudo").setSelected(false);
            
            var oTable = oView.byId("finalCollaudoTable");
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
                that.oFinalCollaudoModel.setProperty("/", response);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata getFilters  fallita SafetyApproval:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
        },
        loadData: function(){
            var that=this;
            let project = that.byId("projectFinalCollaudoFilter").getSelectedKey();
            let sfc = that.byId("sfcFinalCollaudoFilter").getSelectedKey();
            let co = that.byId("coFinalCollaudoFilter").getSelectedKey();
            let customer = that.byId("customerFinalCollaudoFilter").getSelectedKey();

            let showAll = that.byId("showAllfinalCollaudo").getSelected(); 
            let sentToInstallation = that.byId("sentToInstallationFinalCollaudo").getSelected(); 

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
                sentToInstallation: sentToInstallation,
                showAll: showAll
            };

            var successCallback = function(response) {
                that.oFinalCollaudoModel.setProperty("/BusyLoadingOpTable", false);
                that.oFinalCollaudoModel.setProperty("/tableData", response);
            };
            
            var errorCallback = function(error) {
                that.oFinalCollaudoModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oFinalCollaudoModel.setProperty("/BusyLoadingOpTable", true);
            
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
        relazioneIcon: function(reportStatus){
            switch (reportStatus) {
                case "IN_WORK":
                    return "sap-icon://pending";
                case "DONE":
                    return "sap-icon://accept"; 
                default:
                    return "sap-icon://decline";
            }
        },
        relazioneColor: function(reportStatus){
            switch (reportStatus) {
                case "IN_WORK":
                    return "orange";
                case "DONE":
                    return "green"; 
                default:
                    return "red";
            }
        },
    });
});
