sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"rt/rfq/appRFQMassUpload/model/models"
], function(UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("rt.rfq.appRFQMassUpload.Component", {
		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			// console.log(this.getModel("device"));
			var oModel = new sap.ui.model.json.JSONModel();
			this.setModel(oModel, "rfq");
		},
		createContent: function() {
			var r = UIComponent.prototype.createContent.apply(this, arguments);
			r.addStyleClass(this.getContentDensityClass());
			return r;
		},
		getContentDensityClass: function() {
			if (!this._sContentDensityClass) {
				if (Device.system.desktop) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});
});