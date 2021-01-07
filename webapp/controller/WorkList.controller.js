/*global location history */
/* eslint no-console: "error"*/
sap.ui.define([
	"rt/rfq/appRFQMassUpload/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"rt/rfq/appRFQMassUpload/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"rt/rfq/appRFQMassUpload/lib/jszip",
	"rt/rfq/appRFQMassUpload/lib/xlsx"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, MessageToast) {
	"use strict";

	return BaseController.extend("rt.rfq.appRFQMassUpload.controller.WorkList", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			var oViewModel;
			// Model used to manipulate control states
			oViewModel = new JSONModel();
			this.setModel(oViewModel, "worklistView");
			this.getRouter().getRoute("WorkList").attachPatternMatched(this._onObjectMatched, this);

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function() {
			history.go(-1);
		},

		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("ConsMatnr", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ConsMatnr")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		/* =========================================================== */
		/* Handle FIle Uploader                                         */
		/* =========================================================== */
		handleUploadComplete: function(oEvent) {
			var sResponse = oEvent.getParameter("response");
			if (sResponse) {
				var sMsg = "";
				var m = /^\[(\d\d\d)\]:(.*)$/.exec(sResponse);
				if (m[1] === "200") {
					sMsg = "Return Code: " + m[1] + "\n" + m[2] + "(Upload Success)";
					oEvent.getSource().setValue("");
				} else {
					sMsg = "Return Code: " + m[1] + "\n" + m[2] + "(Upload Error)";
				}

				MessageToast.show(sMsg);
			}
		},

		handleUploadPress: function() {
			var that = this;
			var oFileUploader = new sap.ui.unified.FileUploader;
			oFileUploader = this.byId("fileUploader");
			if (!oFileUploader.getValue()) {
				MessageToast.show("Choose a file first");
				return;
			} else {
				that.readXLSX();
			}
		},

		readXLSX: function() {
			var that = this;
			var oFileUploader = that.getView().byId("fileUploader");
			var file = oFileUploader.getFocusDomRef().files[0];
			var excelData = {};
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function(evt) {
					var data = evt.target.result;
					var workbook = XLSX.read(data, {
						type: 'binary'
					});
					workbook.SheetNames.forEach(function(sheetName) {
						var sheet1 =  workbook.Sheets[sheetName];
                        var json = XLSX.utils.sheet_to_json(sheet1, {
                        	header : 1
                        });
						excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], {
							header: 1
						});
					});
					that.createBatch(excelData);
				};
				reader.onerror = function(ex) {
					console.log(ex);
				};
				reader.readAsBinaryString(file);
			}
		},
		/*Function to create the table Dynamically for xlsx file*/
		createBatch: function(a) {
            //Pro Code
           var o = {};
         o.headers = [];
          //map header
           for (var j = 2; j < a.length; j++) { //loop against data_line
           	  var header = {};
           	   for (var i = 0; i < a[1].length;  i++) { //loop against field_name
           	   	  

                   header[a[1][i]] = a[j][i];
           	   	   
           	    }
            o.headers.push(header);
           }
			var final = {};
			final.headers = [];
			for (var k = 0; k < o.length; k++){
                if ( final.length < 1 ){
                //append new rfq
                    var itemsN = [];
                    var itemN = {
                    	ItemNo = o.headers[k]["Item No"],
                    	Material = o.headers[k]["Material"],
                    	Price = o.headers[k]["Price"],
                    	Currency = o.headers[k]["Currency"]
                    };
                    var headerN = {
					RFQNo = o.headers[k]["RFQ number"],
					RFQType = o.headers[k]["RFQ Type"],
					CCode = o.headers[k].["Company Code"]
				    };
                }else{
                //check existing rfq 

                }




				final.headers.push(headerN);
			}
			//Dumbo Code
			// var that = this;
			//Prepare uploaded data by Batch request 
			//Create batchname 
			this.getModel().setDeferredGroups(["batchUpl"]);
			//Append data
			for (var i = 1; i < a.length; i++) {
				//Fill data line
				var oNewData = {
					RFQNo: a[i].RFQNo,
					RFQType: a[i].RFQType,
					CCode: a[i].CCode,
					ItemNo: a[i].ItemNo,
					Material: a[i].Material,
					Price: a[i].Price,
					Currency: a[i].Currency
				};
				//Append each data line to batch request
				this.getModel().create("/ConsignmentMaterialDisplaySet", oNewData, {
					groupId: "batchUpl"
				});
			}
			this.getModel().submitChanges({
				groupId: "batchUpl",
				success: function(oBatchResponse) {
					var abatchResponse = oBatchResponse.__batchResponses;
					var auploadedData = [];

				}.bind(this),
				error: function(oError) {

				}.bind(this)
			})
		},
		handleTypeMissmatch: function(oEvent) {
			var aFileTypes = oEvent.getSource().getFileType();
			jQuery.each(aFileTypes, function(key, value) {
				aFileTypes[key] = "*." + value;
			});
			var sSupportedFileTypes = aFileTypes.join(", ");
			MessageToast.show("The file type *." + oEvent.getParameter("fileType") +
				" is not supported. Choose one of the following types: " +
				sSupportedFileTypes);
		},

		handleValueChange: function(oEvent) {
			MessageToast.show("Press 'Upload File' to upload file '" +
				oEvent.getParameter("newValue") + "'");
		}

	});
});