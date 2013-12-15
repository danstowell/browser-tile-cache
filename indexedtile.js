// indexeddb interface for map tile cacheing
// by Dan Stowell, Nov 2013

// Create/open database
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
	IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
	dbVersion = 1.0;
var request = indexedDB.open("maptilecache", dbVersion),
	db,
	createObjectStore = function (dataBase) {
		dataBase.createObjectStore("tiles");
	},

// This can be overridden to provide the equivalent of onLoad or "ready", but making sure the db connection is OK too.
indexedtile_onready = function() {},

// THE MAIN FUNCTION FOR A USER TO CALL
loadTileToElement = function (tileurl, element, preferredorder) {

	if(!indexedDB){
		// For browsers that don't support indexedDB cacheing
		console.log("No indexedDB detected. Simple fallthrough live tile loading");
		element.src = tileurl;
		return;
	}

	if(!preferredorder){
		preferredorder = "cachefirst"; // --- cachefirst, livefirst, liveonly, cacheonly
	}

	switch(preferredorder){
		case "cachefirst":
			loadTileToElement_CacheOnly(tileurl, element, function(event){
				//console.log("cache miss 1");
				loadImageToDb_liveOnly(tileurl, function(blob) {
					loadTileToElement_CacheOnly(tileurl, element, function(event){
						alert("Failed to load tile from cache AND from remote")
					});
				});
			});
			break;
		case "livefirst":
			loadImageToDb_liveOnly(tileurl, function(blob) {
				loadTileToElement_CacheOnly(tileurl, element, function(event){
					alert("Failed - loaded tile from live, BUT THEN failed to find it in cache")
				});
			}, function(){
				//console.log("live miss 1");
				loadTileToElement_CacheOnly(tileurl, element, function(event){
					alert("Failed to load tile from live AND from cache")
				});
			});
			break;
		case "cacheonly":
			loadTileToElement_CacheOnly(tileurl, element, function(event){
				alert("Failed to load tile from cache (in cacheonly mode)")
			});
			break;
		case "liveonly":
			loadImageToDb_liveOnly(tileurl, function(blob) {
				loadTileToElement_CacheOnly(tileurl, element, function(event){
					alert("Failed to load tile from cached-remote (in liveonly mode)")
				});
			}, function() {
				alert("Failed to load tile from remote (in liveonly mode)")
			});
			break;
	}

},
loadTileToElement_CacheOnly = function(tileurl, element, onfail) {
	var transaction = db.transaction(["tiles"], "readonly");
	var lookuper = transaction.objectStore("tiles").get(tileurl);
	lookuper.onerror = onfail;
	lookuper.onsuccess = function (event) {
		var imgFile = event.target.result;
		//console.log("Successfully found this in cache: " + tileurl);
		if(!imgFile){
			onfail(event);
		}else{
			var URL = window.URL || window.webkitURL;         // Get window.URL object
			var imgURL = URL.createObjectURL(imgFile);        // Create and revoke ObjectURL
			//console.log("Using cached obj: " + imgURL);
			element.setAttribute("src", imgURL);
			URL.revokeObjectURL(imgURL);
		};
	};
};

// This loads from remote into db, asynchronously
loadImageToDb_liveOnly = function (tileurl, doneaction, erroraction) {
	var xhr = new XMLHttpRequest(),
		blob;

	xhr.open("GET", tileurl, true);
	xhr.responseType = "blob";
	xhr.addEventListener("load", function () {
		if (xhr.status === 200) {
			//console.log("Image successfully retrieved from live URL: " + tileurl);
			blob = xhr.response;
			//console.log("Blob:" + blob);
			putTileInDb(tileurl, blob);
			doneaction(blob);
		}else{
			erroraction();
		}
	}, false);
	xhr.send();
},

// called by loadImageToDb_liveOnly. stores it.
putTileInDb = function (tileurl, blob) {
	//console.log("Putting tile into IndexedDB: " + tileurl);
	var transaction = db.transaction(["tiles"], "readwrite");
	var put = transaction.objectStore("tiles").put(blob, tileurl);
};

request.onerror = function (event) {
	console.log("Error creating/accessing IndexedDB database");
};

request.onsuccess = function (event) {
	//console.log("Success creating/accessing IndexedDB database");
	db = request.result;
	db.onerror = function (event) {
		console.log("Error creating/accessing IndexedDB database");
	};
	indexedtile_onready();
}
// For future use. Currently only in latest Firefox versions
request.onupgradeneeded = function (event) {
	createObjectStore(event.target.result);
},

clearTileCache = function(){
	if(confirm("Clear all map tiles from offline cache?")){
		var transaction = db.transaction(["tiles"], "readwrite");
		transaction.objectStore("tiles").delete(IDBKeyRange.lowerBound(""));
	};
};

// end of indexeddb interface
/////////////////////////////////////////////////////////////////////////

