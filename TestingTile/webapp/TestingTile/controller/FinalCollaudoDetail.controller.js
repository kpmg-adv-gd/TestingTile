sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../utilities/CommonCallManager",
	"./popup/ViewDefectPopup",
], function (BaseController, JSONModel, Filter, FilterOperator, CommonCallManager, ViewDefectPopup) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.FinalCollaudoDetail", {
        oFinalCollaudoDetailModel: new JSONModel(),
        oNavFinalCollaudoContainerName: "navContainerFinalCollaudo",
		ViewDefectPopup: new ViewDefectPopup(),
		columnHeaders: {
			parametro: "Parametro",
			valore: "Valore",
			commento: "Commento"
		},
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oFinalCollaudoDetailModel, "FinalCollaudoDetailModel");
			that.setGraphicProperties();
            // Variabile per tracciare il parametro corrente per il commento
			this._currentCommentItem = null;
        },
        onAfterRendering: function () {
            var that = this;
        },
		setGraphicProperties: function(){
			var that=this;
			that.byId("idVizFrame").setVizProperties({
				title: {
					visible: false
				},
				plotArea: {
					colorPalette: ["#A57225","#0A6ED1"],
					stackingOrder: "normal" 
				},
				legend: {
					title: { visible: false }
				}
			});
			// palette personalizzata garfico a torta
			that.byId("idPieChart").setVizProperties({
				plotArea: {
					colorPalette: ["#0A6ED1", "#A57225", "#F2C80F", "#2B9EB3", "#D0011B"], // colori personalizzati
					dataLabel: {
						visible: true,
						type: "valueAndPercent",
						formatString: "##0%", // <-- mostra percentuale corretta moltiplicata per 100
						hideWhenOverlap: true
					}
				},
				title: {
					visible: true,
					text: "Distribuzione Ore per Cluster"
				},
				legend: {
					visible: true
				}
			});
		},
        // Formatter per data
        formatDate: function(date) {
            if (!date) return "";
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd/MM/yyyy HH:mm"
            });
            return oDateFormat.format(new Date(date));
        },
        onNavigateTo: function () {
			var that = this;
			var selected = that.getInfoModel().getProperty("/selectedFinalCollaudoRow");
			that.oFinalCollaudoDetailModel.setProperty("/selectedRow", selected);
			that.oFinalCollaudoDetailModel.setProperty("/columnHeaders", that.columnHeaders);
			// Imposta i dati nelle tabelle
			that.byId("finalCollaudoDetailTable").removeSelections();
			that.oFinalCollaudoDetailModel.setProperty("/groupsData", []);
			that.oFinalCollaudoDetailModel.setProperty("/parameteresData", []);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableResults", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
			that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
			that.oFinalCollaudoDetailModel.setProperty("/selectedGroup", undefined);
			that.loadAllData(false);
		},
		loadAllData(refreshGroups){
			var that=this;
			var selected = that.oFinalCollaudoDetailModel.getProperty("/selectedRow");
			that.loadGroups(selected, refreshGroups);
			that.loadVarianzaCollaudoData();
			that.loadCustomWeigths();
			that.loadRiepilogoText();
			if(selected.reportStatus !== "DONE"){
				that.loadCustomTreeTableDefects();
				that.loadCustomTableMancanti();
				that.loadCustomTreeTableActivities();
				that.loadCustomTreeTableModifiche();
			} else {
				that.loadFreezeData();
			}
		},
		onRefresh: function(){
			var that=this;
			var selected = that.oFinalCollaudoDetailModel.getProperty("/selectedRow");
			that.loadGroups(selected, true);
			that.loadAllData(true);
		},
        // Carico Data Collection - tabella sx
		loadGroups: function (selected, refresh) {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathApi = "/api/getDataCollectionsBySFC";
			let url = BaseProxyURL + pathApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				selected: selected,
				resource: "REPORT_TESTING",
				refresh: refresh
			};

			// Callback di successo
			var successCallback = function (response) {
				this.oFinalCollaudoDetailModel.setProperty("/groupsData", response)
				if (response.length == 0) that.showErrorMessageBox(that.getI18n("msg.dc.empty"))
				var selectedGroup = that.oFinalCollaudoDetailModel.getProperty("/selectedGroup");
				if (selectedGroup) {
					var selectedUpdated = response.filter(item => item.group == selectedGroup.group);
					if (selectedUpdated.length > 0) that.loadParameters(selectedUpdated[0]);
				}
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingOpTable", false);
				that.loadOreCollaudoValues();
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingOpTable", false);
			};

			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingOpTable", true);
			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		onRowChanged: function (oEvent) {
			const oContext = oEvent.getSource().getBindingContext("FinalCollaudoDetailModel");
			if (!oContext) return;
			const sPath = oContext.getPath();
			const oModel = oContext.getModel();
			oModel.setProperty(sPath + "/_dirty", true);
		},
		onSaveButton: function(){
			var that=this;
			that.onSave(true,false);
		},
		onSave:function(passInWork,generateRelation){
			var that=this;

			var updatedWeightData = [];
			var updatedTreeDataDefects = [];
			var updatedTreeDataModifiche = [];
			var updatedTreeDataActivities = [];
			var updatedDataMancanti = [];
			var weightData = that.oFinalCollaudoDetailModel.getProperty("/weightsAll");
			var treeDataDefects = that.oFinalCollaudoDetailModel.getProperty("/treeData");
			var treeDataModifiche = that.oFinalCollaudoDetailModel.getProperty("/treeDataModifiche");
			var treeDataActivities = that.oFinalCollaudoDetailModel.getProperty("/treeDataActivities");
			var dataMancanti = that.oFinalCollaudoDetailModel.getProperty("/mancanti");
			if(!!weightData) updatedWeightData = weightData.filter(w => w._dirty);
			if(!!treeDataDefects) updatedTreeDataDefects = that._collectDirtyRows(treeDataDefects);
			if(!!treeDataModifiche) updatedTreeDataModifiche = that._collectDirtyRows(treeDataModifiche);
			if(!!treeDataActivities) updatedTreeDataActivities = that._collectDirtyRows(treeDataActivities);
			if(!!dataMancanti) updatedDataMancanti = dataMancanti.filter(r => r._dirty);

			sap.ui.core.BusyIndicator.show(0);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/saveDataCollectionsTesting";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var selected = that.oFinalCollaudoDetailModel.getProperty("/selectedRow");
			var dataCollections = that.oFinalCollaudoDetailModel.getProperty("/groupsData");
			var riepilogoText = that.oFinalCollaudoDetailModel.getProperty("/riepilogoText");

			let params = {
				plant: plant,
				order: selected.order,
				sfc: selected.sfc,
				project: selected.project,
				resource: "REPORT_TESTING",
				dataCollections: dataCollections,
				passInWork: passInWork,
				weights: updatedWeightData,
				modifiche: updatedTreeDataModifiche,
				mancanti: updatedDataMancanti,
				activities: updatedTreeDataActivities,
				difetti: updatedTreeDataDefects,
				riepilogoText: riepilogoText
			};

			// Callback di successo
			var successCallback = function (response) {
				sap.m.MessageToast.show(that.getI18n("msg.data.saved"));
				if(generateRelation){
					that.onGenerateRelationAndPdf();
				}
				if(passInWork){
					that.oFinalCollaudoDetailModel.setProperty("/groupsData", []);
					that.oFinalCollaudoDetailModel.setProperty("/parameteresData", []);
					that.loadGroups(selected, false);
					that.oFinalCollaudoDetailModel.setProperty("/selectedRow/reportStatus", "IN_WORK");
					that.loadCustomWeigths();
					sap.ui.core.BusyIndicator.hide();
				}
			}

			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
				sap.ui.core.BusyIndicator.hide();
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);

		},
		onSentToInstallation: function(){
			var that=this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/sendToInstallation";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			let dateNowString = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
			var customFieldsUpdate = [{ "customField": "SENT_TO_INSTALLATION", "customValue": "true"},{ "customField": "TESTING_REPORT_DATE", "customValue": dateNowString}];

			let params = {
				plant: plant,
				order: that.oFinalCollaudoDetailModel.getProperty("/selectedRow").order,
				customFieldsUpdate: customFieldsUpdate
			};

			// Callback di successo
			var successCallback = function (response) {
				that.showToast("Invio effettuato correttamente");
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);

		},
		onGenerateRelation: function(){
			var that=this;
			sap.ui.core.BusyIndicator.show(0);
			that.onSave(false,true);
		},
		onGenerateRelationAndPdf: function(){
			var that=this;

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/generateFinalCollaudoRelation";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			let dateNowString = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
			let user = that.getInfoModel().getProperty("/user_id");
			let order = that.oFinalCollaudoDetailModel.getProperty("/selectedRow").order;
			let sfc = that.oFinalCollaudoDetailModel.getProperty("/selectedRow").sfc;
			let project = that.oFinalCollaudoDetailModel.getProperty("/selectedRow").project

			let treeDefects = that.oFinalCollaudoDetailModel.getProperty("/treeData");
			let treeModifiche = that.oFinalCollaudoDetailModel.getProperty("/treeDataModifiche");
			let treeActivities = that.oFinalCollaudoDetailModel.getProperty("/treeDataActivities");
			let mancanti = that.oFinalCollaudoDetailModel.getProperty("/mancanti");

			let pdfData = that.preparePDFData();

			var customFieldsUpdate = [
				{"customField": "TESTING_REPORT_STATUS", "customValue": "DONE"},
				{"customField": "TESTING_REPORT_USER", "customValue": user},
				{ "customField": "SENT_TO_INSTALLATION", "customValue": "true"},
				{ "customField": "TESTING_REPORT_DATE", "customValue": dateNowString}
			];

			let params = {
				plant: plant,
				order: order,
				sfc: sfc,
				project: project,
				customFieldsUpdate: customFieldsUpdate,
				pdfData: pdfData,
				treeDefects: treeDefects,
				treeModifiche: treeModifiche,
				treeActivities: treeActivities,
				mancanti: mancanti
			};

			// Callback di successo
			var successCallback = function (response) {
				sap.ui.core.BusyIndicator.hide();
				that.oFinalCollaudoDetailModel.setProperty("/selectedRow/reportStatus","DONE");
				that.showToast("Relazione generata correttamente");
			}
			// Callback di errore
			var errorCallback = function (error) {
				sap.ui.core.BusyIndicator.hide();
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);
		},
		// Selezione di una Data Collection
		onSelectGroup: function (oEvent) {
			var that = this;
			var selectedObject = oEvent.getParameter("listItem").getBindingContext("FinalCollaudoDetailModel").getObject();
			// Caricamento tabelle custom
			if (selectedObject.viewCustomTableWeights) { //Sezioni Ispezione
				//that.loadCustomWeigths();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/columnHeaders", that.columnHeaders);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableOreCollaudo) {
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", true);
				let columnHeadersOreCollaudo = {
					parametro: "Descrizione",
					valore: "Ore",
					commento: "Commento"
				};
				that.oFinalCollaudoDetailModel.setProperty("/columnHeaders", columnHeadersOreCollaudo);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableVarianzaCollaudo) {
				//that.loadVarianzaCollaudoData();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", true);
				let columnHeadersVarianzaCollaudo = {
					parametro: "Cluster Varianza",
					valore: "Ore Varianza",
					commento: "Commento"
				};
				that.oFinalCollaudoDetailModel.setProperty("/columnHeaders", columnHeadersVarianzaCollaudo);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if(selectedObject.viewCustomTableNC) {
				//that.loadCustomTreeTableDefects();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableModifiche) {
				//that.loadCustomTreeTableModifiche();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableMancanti) {
				//that.loadCustomTableMancanti();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableActivities) {
				//that.loadCustomTreeTableActivities();
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
			} else if (selectedObject.viewCustomTableFinalCollaudo) {
				// var sTesto = that.oFinalCollaudoDetailModel.getProperty("/riepilogoText");
				// if(!sTesto) that.oFinalCollaudoDetailModel.setProperty("/riepilogoText", "Data:\n\nInvitati:\n\nPresenti:");
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", true);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", false);
			} else {
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableFinalCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewStandard", true);
				that.oFinalCollaudoDetailModel.setProperty("/columnHeaders", that.columnHeaders);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableWeights", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableNC", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableResults", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableVarianzaCollaudo", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableModifiche", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableMancanti", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableActivities", false);
				that.oFinalCollaudoDetailModel.setProperty("/viewCustomTableOreCollaudo", false);
			}
			// Carico parametri
			that.oFinalCollaudoDetailModel.setProperty("/selectedGroup", selectedObject);
			that.loadParameters(selectedObject);
		},
		loadOreCollaudoValues: function(){
			var that=this;
			var parametersBaseLine = that.oFinalCollaudoDetailModel.getProperty("/groupsData").filter(el => el.group === "4 - ANALISI ORE COLLAUDO")[0].parameters;
			var resultsOreCollaudo = [
				{
					Type: "Baseline",
					OreBase: Number(parametersBaseLine[0].valueNumber),
					OreExtra: 0
				},
				{
					Type: "Consuntivo",
					OreBase: Number(parametersBaseLine[1].valueNumber),
					OreExtra: Number(parametersBaseLine[2].valueNumber)
				}
			];
			that.oFinalCollaudoDetailModel.setProperty("/resultsOreCollaudo",resultsOreCollaudo);

		},
		loadVarianzaCollaudoData : function(){
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingVarianzaTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getAnalisiOreVarianza";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var order = that.getInfoModel().getProperty("/selectedFinalCollaudoRow").order;


			let params = {
				plant: plant,
				order: order
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/varianzaCollaudo", response);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingVarianzaTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/varianzaCollaudo", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingVarianzaTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		loadCustomTreeTableActivities: function () {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getActivitiesTesting";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				sfc: that.oFinalCollaudoDetailModel.getProperty("/selectedRow").sfc
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/treeDataActivities", response);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/treeDataActivities", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		loadCustomTreeTableModifiche: function () {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",true);
			
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getModificheTesting";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				project: that.oFinalCollaudoDetailModel.getProperty("/selectedRow").project
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/treeDataModifiche", response);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/treeDataModifiche", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		loadCustomTreeTableDefects: function () {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/db/getDefectsTI";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				project: that.oFinalCollaudoDetailModel.getProperty("/selectedRow").project,
				onlyOpenDefects: true
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/treeData", response);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/treeData", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},		
		// Carico Parametri - tabella dx
		loadParameters: function (selectedGroup) {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/parameteresData", selectedGroup.parameters);
		},
		loadCustomWeigths: function (id) {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingWeightsTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getCustomWeights";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				project:  that.getInfoModel().getProperty("/selectedFinalCollaudoRow").project,
				order: that.getInfoModel().getProperty("/selectedFinalCollaudoRow").order,
				report: "Testing"
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/weightsAll", response);
				that.oFinalCollaudoDetailModel.setProperty("/weights", response);

				var ids = [];
				var map = {};

				response.forEach(item => {
					if (!map[item.id] && !!item.id) {
						map[item.id] = true;
						ids.push({ id: item.id });
					}
				});
				that.oFinalCollaudoDetailModel.setProperty("/listIdReportWeight", ids);
				if (ids.length > 0) {
					var withDate = response.filter(
						item => item.id && item.datetime
					);
					var defaultId = 1;
					if (withDate.length > 0) {
						// trova il più recente
						var latest = withDate.reduce((a, b) =>
							new Date(a.datetime) > new Date(b.datetime) ? a : b
						);
						if(!!latest){
							defaultId = latest.id;
						}
					}
					that.oFinalCollaudoDetailModel.setProperty("/selectedIdReportWeight",defaultId);
					var filtered = response.filter(
						item => item.id === defaultId || !item.id
					);
					that.oFinalCollaudoDetailModel.setProperty("/weights", filtered);
				}
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingWeightsTable", false);
			};

			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/weights", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingWeightsTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		loadRiepilogoText: function(){
			var that=this;
			
			let order = that.getInfoModel().getProperty("/selectedFinalCollaudoRow").order;

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/getRiepilogoTextFinalCollaudo";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var key="RIEPILOGO_FINAL_COLLAUDO_"+order;

			let params = {
				plant: plant,
				key: key
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/riepilogoText", response.value);
			};

			// Callback di errore
			var errorCallback = function (error) {
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		onWeightValueChange:function(oEvent){
			var that=this;
			const oCtx = oEvent.getSource().getBindingContext("FinalCollaudoDetailModel");
			if (!oCtx) return;
			const oModel = oCtx.getModel();
			const sPath = oCtx.getPath();
    		oModel.setProperty(sPath + "/_dirty", true);
		},
		onIdWeightChange: function (oEvent) {
			var that = this;
			var selectedId = Number(oEvent.getSource().getSelectedKey());
			var allWeights = that.oFinalCollaudoDetailModel.getProperty("/weightsAll");
			if (!selectedId) {
				that.oFinalCollaudoDetailModel.setProperty("/weights", allWeights);
				return;
			}
			var filtered = allWeights.filter(function (item) {
				return item.id === selectedId;
			});
			that.oFinalCollaudoDetailModel.setProperty("/weights", filtered);
		},
		loadCustomTableMancanti: function () {
			var that = this;
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/db/getZMancantiReportData";
			let url = BaseProxyURL + pathOrderBomApi;
			
			var plant = that.getInfoModel().getProperty("/plant");

			let params = {
				plant: plant,
				project: that.getInfoModel().getProperty("/selectedFinalCollaudoRow").project
			};

			// Callback di successo
			var successCallback = function (response) {
				that.oFinalCollaudoDetailModel.setProperty("/mancanti", response);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/mancanti", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		onNavBack: function () {
			var that = this;			
			sap.m.MessageBox.confirm(
					that.getI18n("msg.navBack.confirm"),
					{
						title: that.getI18n("msg.navBack.title"),
						onClose: function (oAction) {
							if (oAction === sap.m.MessageBox.Action.OK) {
								that.navToFinalCollaudoHomeView(that.oNavFinalCollaudoContainerName);
							}
						}
					}
				);
		},
		onCommentPress: function (oEvent) {
			var selectedObject = oEvent.getSource().getBindingContext("FinalCollaudoDetailModel").getObject();
			this._currentCommentItem = oEvent.getSource().getBindingContext("FinalCollaudoDetailModel");
			// Apri il dialog del commento
			var oDialog = this.byId("commentCollaudoDialog");
			var oTextArea = this.byId("commentCollaudoTextArea");

			// Carica il commento esistente se presente
			var sExistingComment = selectedObject.comment;
			oTextArea.setValue(sExistingComment || "");

			oDialog.open();
		},
		onSaveComment: function () {
			var that = this;
			var oTextArea = that.byId("commentCollaudoTextArea");
			var sComment = oTextArea.getValue();
			if (this._currentCommentItem) {
				// Salva il commento nel modello
				var sPath = this._currentCommentItem.getPath() + "/comment";
				that.oFinalCollaudoDetailModel.setProperty(sPath, sComment);
				sap.m.MessageToast.show(that.getI18n("msg.comment.saved"));
			}
			that.byId("commentCollaudoDialog").close();
		},
		onCancelComment: function () {
			this.byId("commentCollaudoDialog").close();
		},
		onDetailsDefectPress: function (oEvent) {
            var that = this;
            let defect = oEvent.getSource().getParent().getBindingContext("FinalCollaudoDetailModel").getObject();
            that.ViewDefectPopup.open(that.getView(), that, defect);
        },
		loadFreezeData: function(){
			var that=this;

			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",true);
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",true);
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",true);
			that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",true);

			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/db/getZFinalCollaudoTestingSnapshot";
			let url = BaseProxyURL + pathOrderBomApi;
			
			let plant = that.getInfoModel().getProperty("/plant");
			let project = that.getInfoModel().getProperty("/selectedFinalCollaudoRow").project;
			let order = that.oFinalCollaudoDetailModel.getProperty("/selectedRow").order;
			let sfc = that.oFinalCollaudoDetailModel.getProperty("/selectedRow").sfc;

			let params = {
				plant: plant,
				project: project,
				order: order,
				sfc: sfc
			};

			// Callback di successo
			var successCallback = function (response) {
				if(!!response && response.length > 0){
					let snapshotData = response[0].snapshot_data;
					that.oFinalCollaudoDetailModel.setProperty("/treeData", snapshotData.treeDataDefects);
					that.oFinalCollaudoDetailModel.setProperty("/treeDataModifiche", snapshotData.treeDataModifiche);
					that.oFinalCollaudoDetailModel.setProperty("/treeDataActivities", snapshotData.treeDataActivities);
					that.oFinalCollaudoDetailModel.setProperty("/mancanti", snapshotData.mancanti);
				}
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",false);
			}
			// Callback di errore
			var errorCallback = function (error) {
				that.oFinalCollaudoDetailModel.setProperty("/mancanti", []);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingNcTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingModificheTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingActivitiesTable",false);
				that.oFinalCollaudoDetailModel.setProperty("/BusyLoadingMancantiTable",false);
				that.showErrorMessageBox(error);
			};

			CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, false);
		},
		_collectDirtyRows: function (aNodes, oParentContext = {}, aResult = []) {
			aNodes.forEach(oNode => {

				const oCleanNode = this._sanitizeNodeForPayload(oNode);
				const oMergedContext = this._mergeParentChild(oParentContext, oCleanNode);

				if (oNode._dirty) {
					aResult.push(oMergedContext);
				}

				const aChildren = oNode.children || oNode.Children;

				if (Array.isArray(aChildren) && aChildren.length) {
					this._collectDirtyRows(
						aChildren,
						oMergedContext,
						aResult
					);
				}
			});

			return aResult;
		},
		_mergeParentChild: function (oParent, oChild) {
			const oResult = { ...oChild };

			Object.keys(oParent).forEach(key => {
				if (oResult[key] === undefined || oResult[key] === null) {
					oResult[key] = oParent[key];
				}
			});

			return oResult;
		},
		_sanitizeNodeForPayload: function (oNode) {
			const { children, _dirty, ...oClean } = oNode;
			return oClean;
		},
		//REPORT PDF
		preparePDFData: function() {
			var that = this;

			const oModel = this.getView().getModel("FinalCollaudoDetailModel");
			
			try{
				// === PREPARA I DATI PER IL PDF ===
				
				// 1. Header
				const header = {
					project: oModel.getProperty("/selectedRow/project") || "",
					sfc: oModel.getProperty("/selectedRow/sfc") || "",
					customer: oModel.getProperty("/selectedRow/customer") || ""
				};
				
				// 2. Groups Data (lista sezioni)
				const groupsData = oModel.getProperty("/groupsData") || [];
				
				// 3. Weights (tabella pesi)
				const weights = oModel.getProperty("/weights") || [];
				
				// 4. Varianza Collaudo (tabella + grafico)
				const varianzaCollaudo = oModel.getProperty("/varianzaCollaudo") || [];
				
				// 11. Ore Collaudo (grafico stacked column)
				const oreCollaudo = oModel.getProperty("/groupsData").filter(group => group.viewCustomTableOreCollaudo === true)[0].parameters;

				// 6. TreeData NC (Non Conformità) - flatten della struttura ad albero
				const treeData = this._flattenTreeData(oModel.getProperty("/treeData") || []);
				
				// 7. TreeData Modifiche
				const treeDataModifiche = this._flattenTreeData(oModel.getProperty("/treeDataModifiche") || []);
				
				// 8. TreeData Activities
				const treeDataActivities = this._flattenTreeData(oModel.getProperty("/treeDataActivities") || []);
				
				// 9. Mancanti
				const mancanti = oModel.getProperty("/mancanti") || [];
				
				// 10. Parametri standard (escludo le sezioni che hanno viewCustomTable uguale a true)
				const parameteresData = oModel.getProperty("/groupsData").filter(group =>
					!Object.keys(group).some(key =>
						key.startsWith("viewCustomTable") && group[key] === true
					)
				);
				
				// 12. Riepilogo text
				const riepilogoText = oModel.getProperty("/riepilogoText") || "";
				
				// === COSTRUISCI L'OGGETTO DATI ===
				const pdfData = {
					header,
					groupsData,
					weights,
					varianzaCollaudo,
					treeData,
					treeDataModifiche,
					treeDataActivities,
					mancanti,
					parameteresData,
					oreCollaudo,
					riepilogoText
				};
				
				return pdfData;

			} catch (error) {
				console.error("Errore generazione PDF:", error);
				sap.m.MessageBox.error("Errore durante la generazione del PDF: " + error.message);
			}
			
		},
		onDownloadReportPDF: function () {
			var that = this;
			let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
			let pathOrderBomApi = "/api/downloadVerbalePDF";
			let url = BaseProxyURL + pathOrderBomApi;

			var plant = that.getInfoModel().getProperty("/plant");
			var selected = that.oFinalCollaudoDetailModel.getProperty("/selectedRow");

			let params = {
				plant: plant,
				sfc: selected.sfc,
				isTesting: true
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
		/**
		* Flattena una struttura TreeTable ad array semplice
		* Mantiene l'informazione del livello per il rendering nel PDF
		*/
		_flattenTreeData: function (treeData) {
			const flattened = [];

			const flatten = (nodes, parent = null) => {
				if (!Array.isArray(nodes)) return;

				nodes.forEach(node => {
					const children = node.children || node.Children;

					// Se siamo sul livello 2 (figlio)
					if (parent) {
						let flatNode = { ...node };

						// Eredita dal parent solo i campi mancanti
						Object.keys(parent).forEach(key => {
							if (
								flatNode[key] === undefined &&
								key !== "children" &&
								key !== "Children"
							) {
								flatNode[key] = parent[key];
							}
						});

						flatNode.level = 2;

						// Pulizia struttura tree
						delete flatNode.children;
						delete flatNode.Children;

						flattened.push(flatNode);
					}

					// Scendo di livello
					if (children) {
						flatten(children, node);
					}
				});
			};

			flatten(treeData);
			return flattened;
		}


    });
});
