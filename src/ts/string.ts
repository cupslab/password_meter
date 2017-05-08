/* ***************** */
/* STRING EXTENSIONS */
/* ***************** */

interface String {
	replaceAt(index: number, str: string): string;
	listSubstringsNoFilter(minLength: number): Array<string>;
	escapeHTML(): string;
	listSubstrings(minLength: number): Array<string>;
	frequencies(): Array<number>;
	removeDuplicateChars(): string;
	reverse(): string;
}


String.prototype.replaceAt = function(index: number, str: string): string {
	return this.substr(0, index) + str + this.substr(index + 1);
}

// Returns an array of all substrings after lowercasing the password.
// Substrings are ordered from longest to shortest (min_length).
String.prototype.listSubstringsNoFilter = function(minLength: number) {
        var a = new Array<string>();
        var sanitized = this.toLowerCase();
        var theLength = sanitized.length;
        for (var i = theLength; i >= (minLength - 1); i--) {
                for (var j = 0; (i + j) < theLength; j++) {
                        var sub = sanitized.substring(j, j + i + 1);
                        a.push(sub);
                }
        }
        return a;
};

// Escape HTML in the concrete suggestion to avoid mangling the HTML layout
String.prototype.escapeHTML = function(): string {
	return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}



// Returns an array of all substrings after removing non-alphabetic characters 
// and lowercasing the password. 
// Substrings are ordered from longest to shortest (min_length).
String.prototype.listSubstrings = function(minLength:number): Array<string> {
	var a = new Array();
	var sanitized = this.toLowerCase();
	// Remove non-letters
	var sanitized = sanitized.replace(/[^a-z]/g, "");
	var theLength = sanitized.length;
	for (var i = theLength; i >= (minLength - 1); i--) {
		for (var j = 0; (i + j) < theLength; j++) {
			var sub = sanitized.substring(j, j + i + 1);
			a.push(sub);
		}
	}
	return a;
};

// Returns ASCII frequency array
String.prototype.frequencies = function(): Array<number> {
	var asciiArray: Array<number> = [];
	for (var i = 0; i < this.length; i++) {
		var ascii:number = this.charCodeAt(i);
		if (asciiArray[ascii] == undefined) {
			asciiArray[ascii] = 0;
		}
		asciiArray[ascii]++;
	}
	return asciiArray;
};

// Return only one instance of each character that appears in a string
String.prototype.removeDuplicateChars = function(): string {
	return this.split('').filter(function(item: string, i: number, ar: Array<string>) {
		return ar.indexOf(item) === i;
	}).join('');
}

// Returns the reverse of any string
String.prototype.reverse = function(): string {
	var a: string = '';
	var i: number = this.length;
	while (i--) {
		a += this[i];
	}
	return a;
};