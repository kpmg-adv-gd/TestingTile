sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel, Filter, FilterOperator, CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.InspectionTileView", {
        oInspectionModel: new JSONModel(),
        oNavInspectionContainerName: "navContainerInspection",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oInspectionModel, "inspectionModel");
        },

        onAfterRendering: function () {
            var that = this;
            that.getProjects();
            
        },
		onNavigateTo: function(){

		},

        // Ottengo lista dei Progetti
        getProjects: function () {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/queryMDO/getProjectsVerbaliTesting";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant
            };

            var successCallback = function(response) {
                that.oInspectionModel.setProperty("/projects", response);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata getProjects fallita:", error);
                that.showErrorMessageBox(error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
            
        },

        // Ottengo TreeTable
        loadData: function () {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getVerbaliTileSupervisoreTesting";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
                project: that.byId("projectFilter").getSelectedKey(),
                wbs: that.byId("wbsFilter").getValue(),
                startDate: !!that.byId("startDateFilter").getValue() ? new Date(that.byId("startDateFilter").getValue()) : "",
                endDate: !!that.byId("endDateFilter").getValue() ? new Date(that.byId("endDateFilter").getValue()) : ""
            };

            var successCallback = function(response) {
                that.oInspectionModel.setProperty("/busy", false);
                that.oInspectionModel.setProperty("/treeData", response);
            };
            
            var errorCallback = function(error) {
                that.oInspectionModel.setProperty("/busy", false);
                that.showErrorMessageBox(error);
            };

            that.oInspectionModel.setProperty("/busy", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
            
        },

        // Filtro dati
        onSearchPress: function() {
            var that = this;
            that.loadData();
        },

        // Azzera filtri
        onClearPress: function() {
            var oView = this.getView();
            oView.byId("projectFilter").setSelectedKey('');
            oView.byId("projectFilter").setValue("");
            oView.byId("wbsFilter").setValue("");
            oView.byId("startDateFilter").setValue("");
            oView.byId("endDateFilter").setValue("");
            
            var oTreeTable = oView.byId("inspectionTreeTable");
            var oBinding = oTreeTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter([]);
            }
        },

        // Espandi tutti i nodi
        onExpandAll: function() {
            var oTreeTable = this.getView().byId("inspectionTreeTable");
            oTreeTable.expandToLevel(10);
        },

        // Collassa tutti i nodi
        onCollapseAll: function() {
            var oTreeTable = this.getView().byId("inspectionTreeTable");
            oTreeTable.collapseAll();
        },

        // Gestione selezione riga
        onRowSelectionChange: function(oEvent) {
            var that = this;
            var oTreeTable = oEvent.getSource();
            var iSelectedIndex = oTreeTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTreeTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                
                // Verifica se è una riga figlia (ha SFC valorizzato)
                if (oSelectedData && oSelectedData.sfc) {
                    that.getInfoModel().setProperty("/selectedRow", oSelectedData);
                    that.navToInspectionDetailView(that.oNavInspectionContainerName);
                }
            }
        },

        // Formatter per data
        formatDate: function(date) {
            if (!date) return "";
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd/MM/yyyy HH:mm"
            });
            return oDateFormat.format(new Date(date));
        },

        onDownloadReportPDF: function (oEvent) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/downloadVerbalePDF";
			let url = BaseProxyURL + pathOrderBomApi;

            var selected = oEvent.getSource().getBindingContext("inspectionModel").getObject();

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				sfc: selected.sfc,
			};

			// Callback di successo
			var successCallback = function (response) {
				try {
					var pdfBase64 = response.base64;
					var byteCharacters = atob(pdfBase64);
					var byteNumbers = new Array(byteCharacters.length).fill().map((_,i)=>byteCharacters.charCodeAt(i));
					var byteArray = new Uint8Array(byteNumbers);
					var blob = new Blob([byteArray], { type: "application/pdf" });

					var url = URL.createObjectURL(blob);
					var link = document.createElement("a");
					link.href = url;
					//link.download = "verbale_" + selected.sfc + + "_" + new Date().toISOString().slice(0,10) + ".pdf";
					//link.click();
					window.open(url, "_blank");
				} catch (e) { console.log (e.message) }
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		
		},

    });
});
