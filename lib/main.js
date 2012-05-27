/*
 * YAP
 * Copyright [2012] [Erik 'stipmonster' Kooistra and Pieter 'G33K' Vlasblom]
 */
const {Cc} = require("chrome");
const Ci = Components.interfaces;
const YapVersion = "0.2"
const PR_UINT32_MAX = 0xFFFFFFFF;
const widget = require("widget")
const nsIDownloadManager = Ci.nsIDownloadManager;
const dm = Cc["@mozilla.org/download-manager;1"].getService(nsIDownloadManager);
var Request = require("request").Request;
var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
var func = { notify : function(timer) { hash_status.content = "Start a Download!" } }
var httpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
var hash_status = widget.Widget({
	id : "hashstatus",
	width : 500,
	label : "hashstatus",
	content : "Start a Download!"
});

//Convert HEX to STRING
function HexToString(sCharCode) {
	return ("0" + sCharCode.toString(16)).slice(-2);
}

//Grab the File hash from the webserver.
function getHash(fileLocation, extention, https, CleanCrypto) {
	
	// This is a very very basic setup of our system, this was used in our proof of concept over at hackweekday
	var BaseUrl = fileLocation.host + fileLocation.path
	if(https == 1) {
		BaseUrl = "https://" + BaseUrl + "." + extention
	} else {
		BaseUrl = "http://" + BaseUrl + "." + extention
	}
	
	getUrl(BaseUrl, https);
	Request({
		url : BaseUrl,
		onComplete : function(response) {
			if(response.status == 200) { // 200 OK?
				if(CleanCrypto == response.text.split(" ")[0]) {
					hash_status.content = ("The Download is Valid")
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
				} else {
					hash_status.content = ("This hash is not valid, you may be compromised");
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
				}
				// So, No hashes, lets try some less-safer methods.
					} else {
						getHash(fileLocation, "md5", 1, CleanCrypto) // Get MD5 over SSL if SHA1 is not found
					} else {
						getHash(fileLocation, "sha1", 0, CleanCrypto) // Try SHA1 over plaintext.
					} else {
						getHash(fileLocation, "md5", 0, CleanCrypto) // MD5 Over Plaintext
					} else {
						hash_status.content = "No hash found on the webserver" // Nothing found, get a better webserver plx
						timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
					}
				}
			}
		}
	}).get();
}

/**
 * So our download state has been changed to FINISHED
 * We are now going to do some 1337 stuff, to calculate only 1 hash, and then download a md5 when a sha1 was calculated.
 * we need to fix this right?
 */
var Downloadstate = { onDownloadStateChange : function(aOldState, aDownload) { if(Ci.nsIDownloadManager.DOWNLOAD_FINISHED == aDownload.state) {
			var input_stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			var crypto = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
			
			input_stream.init(aDownload.targetFile, 0x01, 0444, 0)
			
			crypto.init(crypto.SHA1); 
			crypto.updateFromStream(input_stream, PR_UINT32_MAX)
			
			var hash = crypto.finish(false);
			var CleanCrypto = [HexToString(hash.charCodeAt(i)) for (i in hash)].join("");
			
			getHash(aDownload.source, "sha1", 1, CleanCrypto)
		}
	}
};


/*
Expetimental Function, going to implement this --Pieter

function getUrl(DownloadLocation, https) {
	httpRequest.mozBackgroundRequest = true;
	httpRequest.open("GET", DownloadLocation, true);
	httpRequest.onreadystatechange = function(aEvt) {
		if(httpRequest.readyState == 4) {
			var cert = httpRequest.channel.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;
			if(cert.verifyForUsage(Ci.nsIX509Cert.CERT_USAGE_SSLServer) == Ci.nsIX509Cert.VERIFIED_OK) {
				console.log("cert is valid")

			} else {
				console.log("cert is not valid")

			}
		}
	};

}

 */

dm.addListener(Downloadstate);

