/**
 * hibp.js
 * @version v1
 * @author Mehdi Bounya
 *
 * Report any bugs here: https://github.com/mehdibo/hibp-js
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

// based on https://github.com/mehdibo/hibp-js (with additional tweaks for meter/user study)

class PasswordLeaks {

    constructor() {
	this.hibpCache = {};
	this.hibpTimings = {};
    }

    sha1(string){
	var buffer = new TextEncoder("utf-8").encode(string);
	return crypto.subtle.digest("SHA-1", buffer).then(function (buffer) {
            // Get the hex code
            var hexCodes = [];
            var view = new DataView(buffer);
            for (var i = 0; i < view.byteLength; i += 4) {
		// Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
		var value = view.getUint32(i)
		// toString(16) will give the hex representation of the number without padding
		var stringValue = value.toString(16)
		// We use concatenation and slice for padding
		var padding = '00000000'
		var paddedValue = (padding + stringValue).slice(-padding.length)
		hexCodes.push(paddedValue);
            }
            // Join all the hex strings into one
            return hexCodes.join("");
	});
    }

    updateHibpCache(pwd, wasLeaked) {
	this.hibpCache[pwd] = wasLeaked === 1 ? 1 : 0;
	var timeTaken = Date.now() - this.hibpTimings[pwd];
	this.hibpTimings[pwd] = timeTaken;
	console.log((wasLeaked ? "F" : "Not f") + "ound in HIBP database: " + pwd + " [took " +  timeTaken + "ms]");
    }

    hibpCheck(pwd){
	var that = this;
	// We hash the pwd first
	this.sha1(pwd).then(function(hash){
            // We send the first 5 chars of the hash to hibp's API
            const req = new XMLHttpRequest();
            req.addEventListener("load", function(){
		// When we get back a response from the server
		// We create an array of lines and loop through them
		const resp = this.responseText.split('\n');
		const hashSub = hash.slice(5).toUpperCase();
		var wasLeakedResult = 0;
		
		for (var index = 0; index < resp.length; index++){
                    // Check if the line matches the rest of the hash
		    var hashline = resp[index];
		    
                    if (hashline.substring(0, 35) == hashSub) {
			wasLeakedResult = 1;
			break; // If found no need to continue the loop
                    }
		}
		// Trigger an event with the result
		that.updateHibpCache(pwd, wasLeakedResult);
            });
            req.open('GET', 'https://api.pwnedpasswords.com/range/' + hash.substr(0, 5));
            req.send();
	});
    }    

    previouslyLeaked(pwd) {
	if (typeof(this.hibpCache[pwd])==="undefined") {
	    this.hibpCache[pwd] = -1; // signal that we're finding out
	    this.hibpTimings[pwd] = Date.now();
	    this.hibpCheck(pwd);
	}

	if (this.hibpCache[pwd] === -1) {
	    return false; // while figuring these out, say it's okay
	} else {
	    return this.hibpCache[pwd] === 1;
	}
    }
}

exports.PasswordLeaks = PasswordLeaks;
