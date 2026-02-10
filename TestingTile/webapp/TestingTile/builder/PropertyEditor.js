sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "kpmg.custom.testingTile.TestingTile.TestingTile.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("kpmg.custom.testingTile.TestingTile.TestingTile.i18n.builder");
			this.setPluginResourceBundleName("kpmg.custom.testingTile.TestingTile.TestingTile.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			
			this.addInputField(oPropertyFormContainer, "BaseProxyURL", oData);
			this.addInputField(oPropertyFormContainer, "Plant", oData);
			this.addInputField(oPropertyFormContainer, "appKey", oData);

            oFormContainer = oPropertyFormContainer;
		},
		
		getDefaultPropertyData: function(){
			return {
				"BaseProxyURL": "https://proxy_server_gd_dm.cfapps.eu20-001.hana.ondemand.com",
				"Plant": "GD03",
				"appKey": "f39d82a2f36f5ac8f8322a3d7c409d02a6f0e7d4b2181d09d243d70fe232c8cd"
			};
		}

	});
});