/* ***************** */
/* ARRAY EXTENSIONS */
/* ***************** */

interface Array<T> {
	removeDuplicates(): Array<T>;
	contains(x: T, strict: boolean): boolean;
	listSubstringsMinMax(min: number, max: number): Array<string>;
	toHumanString(): string;
	shuffle(): Array<T>;
}

// https://github.com/coolaj86/knuth-shuffle
Array.prototype.shuffle = function <T>(): Array<T> {
	// XXXstroucki modifying the argument?
	var currentIndex: number = this.length;
	var temporaryValue: number;
	var randomIndex: number;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = this[currentIndex];
		this[currentIndex] = this[randomIndex];
		this[randomIndex] = temporaryValue;
	}

	return this;
}

// pretty print array to string (foo, bar and baz)
Array.prototype.toHumanString = function <T>(): string {
	// potentialTODO expect contiguous array.
	var length = this.length;
	if (length == 0) return "(empty)";
	if (length == 1) return this[0].toString();
	var buildString: string = this[0].toString();
	for (var i = 1; i < length - 1; i++) {
		buildString += ", " + this[i].toString();
	}
	buildString += " and " + this[length - 1].toString();
	return buildString;
}

// Remove duplicate elements in array
Array.prototype.removeDuplicates = function <T>(): Array<T> {
	var uniques: Array<T> = (<Array<T>>this).filter(function (item: T, i: number, ar: Array<T>) {
		return ar.indexOf(item) == i;
	});
	return uniques;
}

// Checks for membership of x in the array
// Accepts an optional parameter strict where true indicates
// a case-sensitive check. By default, we assume strict is false.
Array.prototype.contains = function <T>(x: T, strict: boolean): boolean {
	var i = this.length;
	strict = typeof strict !== 'undefined' ? strict : false;
	while (i--) {
		if (this[i] == x) {
			return true;
		}
		// Check non-case-sensitive equality
		if (!strict && typeof x == 'string' && typeof this[i] == 'string') {
			if ((<string>x).toLowerCase() == this[i].toLowerCase()) {
				return true;
			}
		}
	}
	return false;
};

// potentialTODO should this be only in array?
// Returns an array of all substrings of each array element.
// Substrings are ordered from longest (max_length) to shortest (min_length).
Array.prototype.listSubstringsMinMax = function (minLength: number, maxLength: number): Array<string> {
	var a = new Array<string>();
	var longestPartLength = 0;
	for (var part = 0; part < this.length; part++) {
		longestPartLength = Math.max(longestPartLength, this[part].length);
	}

	// potentialTODO handle this better?
	// Set the default minLength to 2 if unspecified
	minLength = typeof minLength !== 'undefined' ? minLength : 2;
	// Set the default maxLength to the length of the longest part if unspecified
	maxLength = typeof maxLength !== 'undefined' ? maxLength : longestPartLength;

	// Iterate (descending) through substring lengths
	for (var i = maxLength; i >= (minLength); i--) {
		// Iterate through password parts
		for (var k = 0; k < this.length; k++) {
			// If password part is at least the length we're examining
			if (this[k].length >= i) {
				for (var j = 0; (j + i) <= this[k].length; j++) {
					a.push(this[k].substring(j, j + i));
				}
			}
		}
	}
	return a;
};
