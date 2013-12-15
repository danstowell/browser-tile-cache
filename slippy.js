// extra js for remembering bookmarks, handling specific buttons, etc
// by Dan Stowell, Dec 2013
var afunc = function() {
var map;
// Create/open database
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
	IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
	dbVersion = 1.0;
var request = indexedDB.open("tiles", dbVersion),
	db,
	createObjectStore = function (dataBase) {
		dataBase.createObjectStore("locmarks");
	};

request.onerror = function (event) {
	console.log("Error creating/accessing IndexedDB database");
},
// For future use. Currently only in latest Firefox versions
request.onupgradeneeded = function (event) {
	createObjectStore(event.target.result);
};

request.onsuccess = function (event) {
	db = request.result;
	db.onerror = function (event) {
		console.log("Error creating/accessing IndexedDB database for slippy.js");
	};
	$(document).ready(function() {
		refreshlocmarks();
	});
};

// asynchronous
var getalllocmarks = function(action) {
	var transaction = db.transaction(["locmarks"], "readonly");
	var locmarks = {};
	transaction.objectStore("locmarks").openCursor().onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			locmarks[cursor.key] =  cursor.value.name;
			cursor.continue();
		}
	};
	transaction.oncomplete = function(){
		action(locmarks);
	};
};
// asynchronous
var refreshlocmarks = function() {
	getalllocmarks(function(locmarks){
		var selector = $("#locmarkselector");
		selector.empty();
		selector.append($("<option></option>").attr("value", "0").text("Bookmarks"));
		$.each(locmarks, function(key, value) {
			selector.append($("<option></option>").attr("value", key).text(key));
		});
		selector.append($("<option></option>").attr("value", "-1").text("Bookmark current location"));
	});
};

$(document).ready(function() {
	$("#clearcacheclick").click(function() { clearTileCache(); return false; });
	indexedtile_onready = function(){
		map = L.map('map').setView([51.505, -0.09], 13);
		L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(map);
	};

	if(navigator.geolocation){
		var geolocme = function(){
			navigator.geolocation.getCurrentPosition( function (userloc) {
				userlon = userloc.coords.longitude;
				userlat = userloc.coords.latitude;
				var fromProjection = new OpenLayers.Projection("EPSG:4326"); // transform from WGS 1984
				var toProjection = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
				L.map('map').zoomToExtent(new OpenLayers.Bounds(
				   (userlon-0.15), (userlat-0.075), (userlon+0.15), (userlat+0.075)
				).transform(fromProjection,toProjection));
			});
			return false;
		};
		$("#geolocmebutton").click(geolocme);
	}else{
		$("#geolocmebutton").style.display = "none";
	}

	$("#locmarkselector").change(function() {
		var chosenloc = $("#locmarkselector").val();

		if(chosenloc=="-1"){
			// Get current location inc zoom
			mapstate = [map.getCenter(), map.getZoom()];
			var newlocname = prompt("Enter a short name for this location:", "");
			// Store into the DB
			var transaction = db.transaction(["locmarks"], "readwrite");
			var put = transaction.objectStore("locmarks").put(mapstate, newlocname);
			transaction.oncomplete = function() {
				refreshlocmarks();
			}
		}else if(chosenloc != "0"){
			// Ask the DB for the location
			var transaction = db.transaction(["locmarks"], "readonly");
			var lookuper = transaction.objectStore("locmarks").get(chosenloc);
			lookuper.onerror = function (event) {
				alert("Failed to get this location: " + chosenloc);
			};
			lookuper.onsuccess = function (event) {
				// If got a result, zoom to it
				var mapstate = event.target.result;
				if(mapstate){
					map.panTo(  mapstate[0]);
					map.setZoom(mapstate[1]);
				}else{
					alert("Error getting mapstate");
				};
			};
		}

		// remember to set the select option back to 0 after
		$("#locmarkselector").val(0);
	});

}); // end onload

}(); // big wrapper
