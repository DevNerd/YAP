// YAP 0.1
// Yet Another Patch, is a plugin made at HITB2012AMS Hackweekday by 2 dutch teenagers.
// This plugin has to serve the purpouse of being a Proof Of Concept of In-Browser Checksum validation.
// Made by Erik Kooistra, and Pieter Vlasblom.

//TODO Create something to serve hashes (SAFELY)

const {Cc} = require("chrome");
const Ci = Components.interfaces;
const YapVersion = "0.1"//Well, we want to define our versionnumber rite :)?
const PR_UINT32_MAX = 0xFFFFFFFF;
const widget = require("widget")

//<DOWNLOADMANAGER>
const nsIDownloadManager = Ci.nsIDownloadManager;
const dm = Cc["@mozilla.org/download-manager;1"].getService(nsIDownloadManager);
var Request = require("request").Request;
var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
var func = {

	notify : function(timer) {
		hash_status.content = "Start a Download!"
	}
}
//</DOWNLOADMANAGER>

//<ONELINERS>
function HexToString(charCode) {
	return ("0" + charCode.toString(16)).slice(-2);
}//Converting HEX to a STR

function getHash(fileLocation, extention, https, CleanCrypto) {
	var BaseUrl = fileLocation.host + fileLocation.path
	if(https == 1) {
		BaseUrl = "https://" + BaseUrl + "." + extention
	} else {
		BaseUrl = "http://" + BaseUrl + "." + extention
	}
	getUrl(BaseUrl,https);	
	Request({
		url : BaseUrl,
		onComplete : function(response) {
			if(response.status == 200) {
				if(CleanCrypto == response.text.split(" ")[0]) {
					hash_status.content = ("The Download is Valid")
					//hash_status.content = ("Hash " + CleanCrypto + " Is Valid Against " + response.text.split(" ")[0]);
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT)
				} else {
					console.log("hash from server"+ CleanCrypto)
					hash_status.content = ("This hash is not valid, you may be compromised");
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT)
				}
			} else {
				console.log("No hash has been found on " + BaseUrl)
				if(https == 1) {
					if(extention == "sha1") {
						console.log("Trying MD5 over SSL")
						getHash(fileLocation, "md5", 1, CleanCrypto)
					} else {
						getHash(fileLocation, "sha1", 0, CleanCrypto)
						console.log("Trying SHA1 ")
					}
				} else {
					if(extention == "sha1") {
						getHash(fileLocation, "md5", 0, CleanCrypto) // HIJ ZOEKT NIET OP SHA1 ZONDER SLL?
					} else {
						hash_status.content = "no hash found"
						timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT)

					}
				}
			}
		}
	}).get();

}
function getUrl(DownloadLocation, https){
	var httpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
	httpRequest.mozBackgroundRequest = true;
	httpRequest.open("GET", DownloadLocation, true);
	httpRequest.onreadystatechange = function (aEvt) {  
	if (httpRequest.readyState == 4) {
		var cert = httpRequest.channel.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).
		SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;	
		if(cert.verifyForUsage(Ci.nsIX509Cert.CERT_USAGE_SSLServer)==Ci.nsIX509Cert.VERIFIED_OK){
			console.log("cert is valid")

		}else{	
			console.log("cert is not valid")

		}
	}
}; 
	
}
//</ONELINERS>

//<VARIABLES>
console.log("YAP " + YapVersion + " Is Loaded as a plugin")//Mandatory Version Message

// Download State Changed, Download is Finished.
var Downloadstate = {
	onDownloadStateChange : function(aOldState, aDownload) {
		if(Ci.nsIDownloadManager.DOWNLOAD_FINISHED == aDownload.state) {
			var input_stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);

			input_stream.init(aDownload.targetFile, 0x01, 0444, 0)
			var crypto = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
			crypto.init(crypto.SHA1);
			//Initing Crypto over here
			crypto.updateFromStream(input_stream, PR_UINT32_MAX)
			var hash = crypto.finish(false);
			//Setting hash to != Finished (Download is still pending)
			var CleanCrypto = [HexToString(hash.charCodeAt(i)) for (i in hash)].
			join("");
			//Creating the SHA1 of the hash and joining it.
			console.log("Debug " + CleanCrypto)
			//<REQUEST FOR HASHFILE>
			getHash(aDownload.source, "sha1", 1, CleanCrypto)
			//</REQUEST FOR HASHFILE>
		}
	}
};

//</VARIABLES>
dm.addListener(Downloadstate);
var hash_status = widget.Widget({
	id : "hashstatus",
	width : 500,
	label : "hashstatus",
	content : "Start a Download!"
});
