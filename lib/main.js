/*
 * YAP
 * Copyright [2012] [Erik 'stipmonster' Kooistra and Pieter 'G33K' Vlasblom]
 */
const {Cc} = require("chrome");
const Ci = Components.interfaces;
const hashtype = Components.interfaces.nsICryptoHash;  
const YapVersion = "0.2"
const PR_UINT32_MAX = 0xFFFFFFFF;
const widget = require("widget")
const nsIDownloadManager = Ci.nsIDownloadManager;
const dm = Cc["@mozilla.org/download-manager;1"].getService(nsIDownloadManager);
var Request = require("request").Request;
var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
var func = { notify : function(timer) { hash_status.content = "Start a Download!" } }
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
//Look at the wiki page for the constants
function getHashFromStream(fileStream,hashType){
	var crypto = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
	crypto.init(hashType);
	crypto.updateFromStream(fileStream, PR_UINT32_MAX)
	return crypto.finish(false);
}
//Grab the File hash from the webserver.
function getHash(fileLocation, extention, https, CleanCrypto) {
	
	// This is a very very basic setup of our system, this was used in our proof of concept over at hackweekday
	var BaseUrl = fileLocation.host + fileLocation.path
	if(https == 1) {
		BaseUrl = "https://" + BaseUrl + "."
	} else {
		BaseUrl = "http://" + BaseUrl + "."
	}
	switch(extention){
		case hashtype.SHA1:
			BaseUrl = BaseUrl + "sha1"
			break;
		case hashtype.MD5:
			BaseUrl = BaseUrl + "md5"
			break;
	}
	Request({
		url : BaseUrl,
		onComplete : function(response) {
			if(response.status == 200) { // 200 OK?
				if(CleanCrypto[extention] == response.text.split(" ")[0]) {
					hash_status.content = ("The Download is Valid")
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
				} else {
					hash_status.content = ("This hash is not valid, you may be compromised");
					timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
				}
				// So, No hashes, lets try some less-safer methods.
				} else{ // Get MD5 over SSL if SHA1 is not found

					if(https==1){
						if(extention==hashtype.SHA1){
							getHash(fileLocation, hashtype.MD5,1, CleanCrypto)
						}else{
							getHash(fileLocation, hashtype.SHA1,0, CleanCrypto)
						}
					}else{
						if(extention==hashtype.SHA1){
							getHash(fileLocation,hashtype.MD5,0, CleanCrypto)
						}else{
							hash_status.content = ("No hash found on server")
							timer.initWithCallback(func, 10000, Components.interfaces.nsITimer.TYPE_ONE_SHOT) // HACKY SOLUTION
						}
					}


				}
			}
	}).get();
	if(https==1){
		getCertInfo(BaseUrl);
	}


}

/**
 * So our download state has been changed to FINISHED
 * We are now going to do some 1337 stuff, to calculate only 1 hash, and then download a md5 when a sha1 was calculated.
 * we need to fix this right?
 */
var Downloadstate = { onDownloadStateChange : function(aOldState, aDownload) {
 if(Ci.nsIDownloadManager.DOWNLOAD_FINISHED == aDownload.state) {
			var input_stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			var crypto = Components.classes["@mozilla.org/security/hash;1"].createInstance(Components.interfaces.nsICryptoHash);
			input_stream.init(aDownload.targetFile, 0x01, 0444, 0)
			var hashRaw = new Array();
			hashRaw[hashtype.SHA1] = getHashFromStream(input_stream,hashtype.SHA1);
			//reopenstream if this is not done no second hash is calulated
			input_stream.close();
			input_stream.init(aDownload.targetFile, 0x01, 0444, 0)
			hashRaw[hashtype.MD5] = getHashFromStream(input_stream,hashtype.MD5);
			var CleanCrypto = new Array();
			CleanCrypto[hashtype.SHA1] = [HexToString(hashRaw[hashtype.SHA1].charCodeAt(i)) for (i in hashRaw[hashtype.SHA1])].join("");
			CleanCrypto[hashtype.MD5] = [HexToString(hashRaw[hashtype.MD5].charCodeAt(i)) for (i in hashRaw[hashtype.MD5])].join("");
			getHash(aDownload.source, hashtype.SHA1, 1, CleanCrypto)
		}
	}
};



//Expetimental Function, going to implement this --Pieter

function getCertInfo(DownloadLocation) {
	var httpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
	httpRequest.open("GET", DownloadLocation, true);
	httpRequest.onload = function(aEvt) {
			if(response.status == 200){
				validCertificate(httpRequest.channel);
			}	
		};
	httpRequest.send();
}

 
function validCertificate(channel) {
	console.log("checking");
	try {		
		// Do we have a valid channel argument?
		if (! channel instanceof  Ci.nsIChannel) {
			console.log("No channel available\n");
			return;
		}
		
		var secInfo = channel.securityInfo;
		
		
		// Print general connection security state
		console.log("Security Info:\n");
		
		if (secInfo instanceof Ci.nsITransportSecurityInfo) {
			
			secInfo.QueryInterface(Ci.nsITransportSecurityInfo);
			
			console.log("\tSecurity state: ");
			
			// Check security state flags
			if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_SECURE) == Ci.nsIWebProgressListener.STATE_IS_SECURE)
				console.log("secure\n");
			
			else if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_INSECURE) == Ci.nsIWebProgressListener.STATE_IS_INSECURE)
				console.log("insecure\n");
				
			else if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_BROKEN) == Ci.nsIWebProgressListener.STATE_IS_BROKEN)
				console.log("unknown\n");
			
			console.log("\tSecurity description: " + secInfo.shortSecurityDescription + "\n");
			console.log("\tSecurity error message: " + secInfo.errorMessage + "\n");
		}
		else {
			
			console.log("\tNo security info available for this channel\n");
		}
		
		// Print SSL certificate details
		if (secInfo instanceof Ci.nsISSLStatusProvider) {
			
			var cert = secInfo.QueryInterface(Ci.nsISSLStatusProvider).
			SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;
			
			console.log("\nCertificate Status:\n");
			
			var verificationResult = cert.verifyForUsage(Ci.nsIX509Cert.CERT_USAGE_SSLServer);
			console.log("\tVerification: ");
			
			switch (verificationResult) {
				case Ci.nsIX509Cert.VERIFIED_OK:
					console.log("OK");
					break;
				case Ci.nsIX509Cert.NOT_VERIFIED_UNKNOWN:
					console.log("not verfied/unknown");
					break;
				case Ci.nsIX509Cert.CERT_REVOKED:
					console.log("revoked");
					break;
				case Ci.nsIX509Cert.CERT_EXPIRED:
					console.log("expired");
					break;
				case Ci.nsIX509Cert.CERT_NOT_TRUSTED:
					console.log("not trusted");
					break;
				case Ci.nsIX509Cert.ISSUER_NOT_TRUSTED:
					console.log("issuer not trusted");
					break;
				case Ci.nsIX509Cert.ISSUER_UNKNOWN:
					console.log("issuer unknown");
					break;
				case Ci.nsIX509Cert.INVALID_CA:
					console.log("invalid CA");
					break;
				default:
					console.log("unexpected failure");
					break;
			}
			console.log("\n");
			
			console.log("\tCommon name (CN) = " + cert.commonName + "\n");
			console.log("\tOrganisation = " + cert.organization + "\n");
			console.log("\tIssuer = " + cert.issuerOrganization + "\n");
			console.log("\tSHA1 fingerprint = " + cert.sha1Fingerprint + "\n");
			
			var validity = cert.validity.QueryInterface(Ci.nsIX509CertValidity);
			console.log("\tValid from " + validity.notBeforeGMT + "\n");
			console.log("\tValid until " + validity.notAfterGMT + "\n");
		}
	} catch(err) {
		alert(err);
	}
}
dm.addListener(Downloadstate);

