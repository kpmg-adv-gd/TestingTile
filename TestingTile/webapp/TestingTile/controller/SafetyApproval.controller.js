sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel, Filter, FilterOperator, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.SafetyApproval", {
        oSafetyApprovalModel: new JSONModel(),
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oSafetyApprovalModel, "safetyApprovalModel");
        },

        onAfterRendering: function () {
            var that = this;
            that.getFilters();
        },
		onNavigateTo: function(){
            var that = this;
            that.getFilters();
            that.oSafetyApprovalModel.setProperty("/selectedRow", undefined);
		},
        getFilters: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/api/getFilterSafetyApproval";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant
            };

            var successCallback = function(response) {
                that.oSafetyApprovalModel.setProperty("/", response);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata getFilters  fallita SafetyApproval:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
        },
        /* ==========================
        FORMATTERS STATUS TABELLA
        ========================== */   
        statusIcon: function (sStatus) {
            switch (sStatus) {
                case "Approved":
                    return "sap-icon://accept";
                case "Not Approved":
                    return "sap-icon://decline"; 
                case "Rejected":
                    return "sap-icon://decline"; 
                case "Waiting":
                    return "sap-icon://pending"; 
                default:
                    return "";
            }
        },
        statusColor: function (sStatus) {
            switch (sStatus) {
                case "Approved":
                    return "green";
                case "Not Approved":
                    return "red";
                case "Rejected":
                    return "red";                        
                case "Waiting":
                    return "orange";
                case "Rejected":
                    return "red";    
                default:
                    return "gray";
            }
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
                that.oSafetyApprovalModel.setProperty("/selectedRow", oSelectedData);
            } else{
                that.oSafetyApprovalModel.setProperty("/selectedRow", undefined);
            }
        },
        onSearchPress: function(){
            var that=this;
            that.loadData();
        },
        // Azzera filtri
        onClearPress: function() {
            var oView = this.getView();
            oView.byId("projectsafetyApprovalFilter").setSelectedKey('');
            oView.byId("orderSafetyApprovalFilter").setSelectedKey('');
            oView.byId("coSafetyApprovalFilter").setSelectedKey('');
            oView.byId("orderSafetyApprovalFilter").setValue("");
            oView.byId("coSafetyApprovalFilter").setValue("");
            oView.byId("startDateSafetyApprovalFilter").setValue("");
            oView.byId("endDateSafetyApprovalFilter").setValue("");
            oView.byId("showAllsafetyApproval").setSelected(false);
            
            var oTable = oView.byId("safetyApprovalTable");
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter([]);
            }
        },
        loadData: function(){
            var that=this;
            let project = that.byId("projectsafetyApprovalFilter").getSelectedKey();
            let order = that.byId("orderSafetyApprovalFilter").getSelectedKey();
            let co = that.byId("coSafetyApprovalFilter").getSelectedKey();
            let startDate = !!that.byId("startDateSafetyApprovalFilter").getValue() ? new Date(that.byId("startDateSafetyApprovalFilter").getValue()) : "";
            let endDate = !!that.byId("endDateSafetyApprovalFilter").getValue() ? new Date(that.byId("endDateSafetyApprovalFilter").getValue()) : "";
            let showAll = that.byId("showAllsafetyApproval").getSelected(); 

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getSafetyApprovalData";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
                project: project,
                co: co,
                order: order,
                startDate: startDate,
                endDate: endDate,
                showAll: showAll
            };

            var successCallback = function(response) {
                that.oSafetyApprovalModel.setProperty("/BusyLoadingOpTable", false);
                that.oSafetyApprovalModel.setProperty("/tableData", response);
            };
            
            var errorCallback = function(error) {
                that.oSafetyApprovalModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oSafetyApprovalModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);


        },
        onOpenDialog: function(){
            var that=this;
			// Apri il dialog del commento e salvataggio
			var oDialog = this.byId("commentSafetyDialog");
            that.byId("commentApproveTextArea").setValue("");
			oDialog.open();
        },
        onCloseDialog: function () {
            var that=this;
			that.byId("commentSafetyDialog").close();
		},
        onApprove: function(){
            var that=this;
            let selected = that.oSafetyApprovalModel.getProperty("/selectedRow");
            
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/doSafetyApproval";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");
            var sfc = selected.sfc;
            let idLev2 = selected.id_lev_2;
            let machineType = selected.machineType;
            let user = selected.user;
            var comment = that.byId("commentApproveTextArea").getValue();

            let params = {
                plant: plant,
                sfc: sfc,
                idLev2: idLev2,
                machineType: machineType,
                user: user,
                comment: comment
            };

            var successCallback = function(response) {
                that.loadData();
                that.byId("commentSafetyDialog").close();
                that.showToast("Approve completato con successo.");
            };
            
            var errorCallback = function(error) {
                that.byId("commentSafetyDialog").close();
                console.log(error);
            };

            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);
        },
        onCancel: function(){
            var that=this;
            let selected = that.oSafetyApprovalModel.getProperty("/selectedRow");
            
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/doCancelSafety";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");
            var sfc = selected.sfc;
            let idLev2 = selected.id_lev_2;
            let user = selected.user;

            let params = {
                plant: plant,
                sfc: sfc,
                idLev2: idLev2,
                user: user
            };

            var successCallback = function(response) {
                that.loadData();
                that.showToast("Cancellazione completata con successo.");
            };
            
            var errorCallback = function(error) {
                console.log(error);
            };

            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);
        },
    });
});
