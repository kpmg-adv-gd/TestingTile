sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utilities/CommonCallManager",
], function (BaseController, JSONModel,CommonCallManager) {
    "use strict";

    return BaseController.extend("kpmg.custom.testingTile.TestingTile.TestingTile.controller.VerbalManagementDetail", {
        oVerbalManagementDetailModel: new JSONModel(),
        oNavVerbalManagementContainerName: "navContainerVerbalManagement",
        onInit: function () {
            var that=this;
            that.getView().setModel(that.oVerbalManagementDetailModel, "verbalManagementDetailModel");
            that.oVerbalManagementDetailModel.setProperty("/editMode", false);
        },

        onAfterRendering: function () {
            var that = this;
        },
        onNavigateTo: function () {
			var that = this;
            let workcenters = that.getInfoModel().getProperty("/workcenters");
            let rowSelected =  that.getInfoModel().getProperty("/selectedVerbalManagementRow");
            that.oVerbalManagementDetailModel.setProperty("/workcenters", workcenters);
            that.oVerbalManagementDetailModel.setProperty("/editMode", false);
            that.oVerbalManagementDetailModel.setProperty("/selectedVerbalManagementRow", rowSelected);
            that.oVerbalManagementDetailModel.setProperty("/selectedTreeTableRow", undefined);
			that.loadTreeTable();
		},
        onRowSelectionChange: function(oEvent){
            var that=this;
            var oTreeTable = oEvent.getSource();
            var iSelectedIndex = oTreeTable.getSelectedIndex();
            
            if (iSelectedIndex >= 0) {
                var oContext = oTreeTable.getContextByIndex(iSelectedIndex);
                var oSelectedData = oContext.getObject();
                that.oVerbalManagementDetailModel.setProperty("/selectedTreeTableRow", oSelectedData);
            } else{
                that.oVerbalManagementDetailModel.setProperty("/selectedTreeTableRow", undefined);
            }
        },
        loadTreeTable: function(){
            var that=this;

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/getVerbalManagementTreeTable";
            let url = BaseProxyURL + pathApi;
            
            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedVerbalManagementRow/order");

            let params = {
                plant: plant,
                order: order
            };

            var successCallback = function(response) {
                that.oVerbalManagementDetailModel.setProperty("/BusyLoadingOpTable", false);
                that.oVerbalManagementDetailModel.setProperty("/treeData", response);
                // Snapshot IMMUTABILE per confronto
                that.oVerbalManagementDetailModel.setProperty("/_originalTreeData",JSON.parse(JSON.stringify(response)));
            };
            
            var errorCallback = function(error) {
                that.oVerbalManagementDetailModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oVerbalManagementDetailModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);
        },
        // Espandi tutti i nodi
        onExpandAll: function() {
            var oTreeTable = this.getView().byId("verbalManagementTreeTable");
            oTreeTable.expandToLevel(10);
        },
        // Collassa tutti i nodi
        onCollapseAll: function() {
            var oTreeTable = this.getView().byId("verbalManagementTreeTable");
            oTreeTable.collapseAll();
        },
        onEditTreeTable: function(){
            var that=this;
            let isEdit = that.oVerbalManagementDetailModel.getProperty("/editMode");
            that.oVerbalManagementDetailModel.setProperty("/editMode", !isEdit);
        },
        onSave: function (doRelease) {
            var that=this;
            
            var { level1Changes, level2Changes, newLevel1, newLevel2, newLevel3 } = that.recoverModify();
            var deletedLevel1 = that._getDeletedLevel1Nodes();

            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedVerbalManagementRow/order");

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/saveVerbalManagementTreeTableChanges";
            let url = BaseProxyURL + pathApi;

            let params = {
                plant: plant,
                order: order,
                level1Changes: level1Changes,
                level2Changes: level2Changes,
                newLevel1: newLevel1,
                newLevel2: newLevel2,
                newLevel3: newLevel3,
                deletedLevel1: deletedLevel1
            };

            var successCallback = function(response) {
                if(doRelease==true){
                    that.onVerbalRelease();
                } else{
                    that.loadTreeTable();
                    that.showToast("Salvataggio completato con successo.");
                }
            };
            
            var errorCallback = function(error) {
                that.oVerbalManagementDetailModel.setProperty("/BusyLoadingOpTable", false);
                that.showErrorMessageBox(error);
            };

            that.oVerbalManagementDetailModel.setProperty("/BusyLoadingOpTable", true);
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, false);


        },
        recoverModify: function () {
            const treeData = this.oVerbalManagementDetailModel.getProperty("/treeData");

            //Modifiche effettuate
            const level1Changes = [];
            const level2Changes = [];
            //Duplicazioni effettuate
            const newLevel1 = [];
            const newLevel2 = [];
            const newLevel3 = [];

            const traverse = (node, parentLev1, parentLev2) => {

                /* =====================================================
                * NUOVI RECORD (DUPLICATI)
                * ===================================================== */
                if (node.__isNew) {

                    /* ---------- LEVEL 1 ---------- */
                    if (node.level === 1) {
                        const iDupIndex = this._extractDuplicateIndex(node.description);
                        const sSuffix = `_${iDupIndex}`;

                        newLevel1.push({
                            originalStepId: parentLev1.stepId,
                            stepId: this._incrementStepId(parentLev1.stepId, iDupIndex - 1),
                            originalOperationActivity: parentLev1.operationActivity,
                            operationActivity: `${parentLev1.operationActivity}${sSuffix}`,
                            workcenter: node.workcenter,
                            description: node.description
                        });
                    }

                    /* ---------- LEVEL 2 ---------- */
                    if (node.level === 2 && parentLev1) {
                        const iDupIndex = this._extractDuplicateIndex(parentLev1.description);
                        const sSuffix = `_${iDupIndex}`;

                        newLevel2.push({
                            originalStepId: parentLev1.stepId,
                            lev2Id: node.idLev2,
                            stepId: this._incrementStepId(parentLev1.stepId, iDupIndex - 1),
                            suffix: sSuffix,
                            safety: node.safety,
                            workcenter: node.workcenter,
                            active: node.active,
                            originalOperationActivity: parentLev1.operationActivity,
                            operationActivity: `${parentLev1.operationActivity}${sSuffix}`
                        });
                    }

                    /* ---------- LEVEL 3 ---------- */
                    if (node.level === 3 && parentLev2 && parentLev1) {
                        const iDupIndex = this._extractDuplicateIndex(parentLev1.description);
                        const sSuffix = `_${iDupIndex}`;

                        newLevel3.push({
                            newStepId: this._incrementStepId(
                                parentLev1.stepId,
                                iDupIndex - 1
                            ),
                            suffix: sSuffix,
                            originalLev2Id: parentLev2.idLev2,
                            originalLev1Id: parentLev1.stepId
                        });
                    }
                }

                /* =====================================================
                * MODIFICHE RECORD ESISTENTI
                * ===================================================== */
                if (node._original) {

                    /* ---------- LEVEL 1 ---------- */
                    if (node.level === 1 && node.workcenter !== node._original.workcenter) {
                        level1Changes.push({
                            stepId: node.stepId,
                            workcenter: node.workcenter
                        });
                    }

                    /* ---------- LEVEL 2 ---------- */
                    if (node.level === 2) {
                        const changedFields = {};

                        if (node.workcenter !== node._original.workcenter) {
                            changedFields.workcenter = node.workcenter;
                        }
                        if (node.safety !== node._original.safety) {
                            changedFields.safety = node.safety;
                        }
                        if (node.active !== node._original.active) {
                            changedFields.active = node.active;
                        }

                        if (Object.keys(changedFields).length > 0) {
                            level2Changes.push({
                                idLev2: node.idLev2,
                                idLev1: parentLev1?.stepId,
                                ...changedFields
                            });
                        }
                    }
                }

                /* =====================================================
                * VISITA FIGLI
                * ===================================================== */
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        traverse(
                            child,
                            node.level === 1 ? node : parentLev1,
                            node.level === 2 ? node : parentLev2
                        );
                    });
                }
            };

            treeData.forEach(root => traverse(root, root, null));

            return {
                level1Changes,
                level2Changes,
                newLevel1,
                newLevel2,
                newLevel3
            };
        },
        onWorkcenterChange: function (oEvent) {
            var that=this;
            const oCombo = oEvent.getSource();
            const oCtx = oCombo.getBindingContext("verbalManagementDetailModel");
            const sNewWC = oCombo.getSelectedKey();

            const oNode = oCtx.getObject();

            // SOLO se livello 1
            if (oNode.level !== 1) {
                return;
            }

            const oModel = oCtx.getModel();
            const sPath = oCtx.getPath();

            // Aggiorna figli livello 2
            if (oNode.children && oNode.children.length > 0) {
                oNode.children.forEach((child, index) => {
                    const childPath = `${sPath}/children/${index}/workcenter`;
                    oModel.setProperty(childPath, sNewWC);
                });
            }
        },
        onDuplicateTreeTable: function () {
            const that = this;

            const aTreeData = that.oVerbalManagementDetailModel.getProperty("/treeData");
            const oSelected = that.oVerbalManagementDetailModel.getProperty("/selectedTreeTableRow");

            const oClone = that._deepClone(oSelected);

            // Marca tutto il sottoalbero come NEW
            that._markAsNew(oClone);

            // Description con suffisso
            oClone.description = that._getDuplicatedDescription(
                oSelected.description,
                aTreeData
            );

            const iOriginalIndex = aTreeData.indexOf(oSelected);
            aTreeData.splice(iOriginalIndex + 1, 0, oClone);

            that.oVerbalManagementDetailModel.setProperty("/treeData", aTreeData);
        },
        onDeleteTreeTable: function () {
            var that = this;
            var selected = that.oVerbalManagementDetailModel.getProperty("/selectedTreeTableRow");

            // NON è un duplicato
            if (!selected.__isNew && !selected.__isDuplicate) {
                that.showErrorMessageBox("È possibile eliminare solo righe duplicate.");
                return;
            }

            // Rimuovi il nodo dal treeData
            const aTreeData = that.oVerbalManagementDetailModel.getProperty("/treeData");
            that._removeNodeFromTree(aTreeData, selected);

            that.oVerbalManagementDetailModel.setProperty("/treeData", aTreeData);
        },
        onRelease: function(){
            var that=this;
            that.onSave(true);
        },
        onVerbalRelease: function(){
            var that=this;

            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedVerbalManagementRow/order");

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi =  "/api/releaseVerbalManagement";
            let url = BaseProxyURL + pathApi;

            let params = {
                plant: plant,
                order: order
            };

            var successCallback = function(response) {
                that.onNavBack();
                that.showToast("Verbale rilasciato con successo.");
            };
            
            var errorCallback = function(error) {
                that.showErrorMessageBox(error);
            };
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, false, true);
        },
        _deepClone: function (oNode) {
            return JSON.parse(JSON.stringify(oNode));
        },
        _markAsNew: function (oNode) {
            oNode.__isNew = true;
            delete oNode._original;

            if (oNode.children && oNode.children.length > 0) {
                oNode.children.forEach(child => this._markAsNew(child));
            }
        },
        _getDuplicatedDescription: function (sDescription, aTreeData) {
            const sBase = sDescription.replace(/\s\(\d+\)$/, "");
            let iMax = 1;

            aTreeData.forEach(oItem => {
                const sDesc = oItem.description || "";
                const oMatch = sDesc.match(new RegExp(`^${this._escapeRegExp(sBase)}\\s\\((\\d+)\\)$`));

                if (oMatch) {
                    iMax = Math.max(iMax, parseInt(oMatch[1], 10));
                }

                if (sDesc === sBase) {
                    iMax = Math.max(iMax, 1);
                }
            });

            return `${sBase} (${iMax + 1})`;
        },
        _escapeRegExp: function (string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        },
        //estrarre il numero (n) dalla description
        _extractDuplicateIndex: function (sDescription) {
            const oMatch = sDescription.match(/\((\d+)\)$/);
            return oMatch ? parseInt(oMatch[1], 10) : 1;
        },
        //incremento stepId con padding
        _incrementStepId: function (sStepId, iIncrement) {
            const iLen = sStepId.length;
            const iNew = parseInt(sStepId, 10) + iIncrement;
            return String(iNew).padStart(iLen, "0");
        },
        _removeNodeFromTree: function (aNodes, oTarget) {
            const iIndex = aNodes.indexOf(oTarget);

            if (iIndex !== -1) {
                aNodes.splice(iIndex, 1);
                return true;
            }

            for (let i = 0; i < aNodes.length; i++) {
                const oNode = aNodes[i];

                if (oNode.children && oNode.children.length > 0) {
                    const bRemoved = this._removeNodeFromTree(oNode.children, oTarget);
                    if (bRemoved) {
                        // se vuoi, puoi anche pulire children vuoti
                        return true;
                    }
                }
            }

            return false;
        },
        //Restituisce tramite comparazione i livelli 1 cancellati
        _getDeletedLevel1Nodes: function () {
            const original = this.oVerbalManagementDetailModel.getProperty("/_originalTreeData") || [];
            const current = this.oVerbalManagementDetailModel.getProperty("/treeData") || [];

            const currentStepIds = new Set(
                current
                    .filter(n => n.level === 1)
                    .map(n => n.stepId)
            );

            return original
                .filter(n => n.level === 1)
                .filter(n => !currentStepIds.has(n.stepId))
                .map(n => ({
                    stepId: n.stepId,
                    operationActivity: n.operationActivity
                }));
        },
        onNavBack: function(){
            var that=this;
            that.navToVerbalManagementHomeView(that.oNavVerbalManagementContainerName);
        },
    });
});
