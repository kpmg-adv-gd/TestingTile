sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel, Filter, FilterOperator, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.VerbalManagementHome", {
        oVerbalManagementModel: new JSONModel(),
        oNavVerbalManagementContainerName: "navContainerVerbalManagement",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oVerbalManagementModel, "verbalManagementModel");
        },

        onAfterRendering: function () {
            var that = this;
            that.getFilters();
        },
		onNavigateTo: function(){

		},
        getFilters: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/api/getFilterVerbalManagement";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant
            };

            var successCallback = function(response) {
                that.oVerbalManagementModel.setProperty("/", response);
                that.getInfoModel().setProperty("/workcenters",response?.workcenters);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata getFilters  fallita VerbalManagementHome:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
        },
        onSearchPress: function(){
            var that=this;
            that.loadData();
        },
        onClearPress: function() {
            var oView = this.getView();
            oView.byId("projectVerbalManagementFilter").setValue("");
            oView.byId("coVerbalManagementFilter").setValue("");
            oView.byId("orderVerbalManagementFilter").setValue("");
            oView.byId("customerVerbalManagementFilter").setValue("");
            oView.byId("projectVerbalManagementFilter").setSelectedKey('');
            oView.byId("coVerbalManagementFilter").setSelectedKey('');
            oView.byId("orderVerbalManagementFilter").setSelectedKey('');
            oView.byId("customerVerbalManagementFilter").setSelectedKey('');
            oView.byId("showAllVerbalManagement").setSelected(false);
            
            var oTable = oView.byId("verbalManagementTable");
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter([]);
            }
        },
        loadData: function(){
            var that=this;
            let project = that.byId("projectVerbalManagementFilter").getSelectedKey();
            let co = that.byId("coVerbalManagementFilter").getSelectedKey();
            let order = that.byId("orderVerbalManagementFilter").getSelectedKey();
            let customer = that.byId("customerVerbalManagementFilter").getSelectedKey();
            let showAll = that.byId("showAllVerbalManagement").getSelected();


            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getVerbalManagementTable";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
                project: project,
                co: co,
                order: order,
                customer: customer,
                showAll: showAll
            };

            var successCallback = function(response) {
                that.oVerbalManagementModel.setProperty("/BusyLoadingOpTable", false);
                that.oVerbalManagementModel.setProperty("/tableData", response);
            };
            
            var errorCallback = function(error) {
                that.oVerbalManagementModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oVerbalManagementModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);


        },
        /* ==========================
           FORMATTERS STATUS TABELLA
           ========================== */    
        statusIcon: function (sStatus) {
            if (sStatus === "RELEASED") {
                return "sap-icon://accept";    
            }
            if (sStatus === "RELEASABLE") {
                return "sap-icon://information";
            }
            return "";
        },
        statusColor: function (sStatus) {
            if (sStatus === "RELEASED") {
                return "green"; 
            }
            if (sStatus === "RELEASABLE") {
                return "blue";  
            }   
            return "";
        },
        /* ==========================
           ========================== */
        
        // Gestione selezione riga
        onRowSelectionChange: function(oEvent) {
            var that = this;
            var oTable = oEvent.getSource();
            var iSelectedIndex = oTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                that.getInfoModel().setProperty("/selectedVerbalManagementRow", oSelectedData);
                that.navToVerbalManagementDetailView(that.oNavVerbalManagementContainerName);
            }
        },

    });
});
