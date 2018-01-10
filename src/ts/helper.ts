// pass in jquery reference, LZString reference and boolean flag for verbose output
import JQuery = require("jquery");
import LZString = require("lz-string");
import PasswordMeter = require("./PasswordMeter");
import LogLevel = require("loglevel");

export module Helper {
	interface MatchFoo {
		matched: Array<RegExpMatchArray>;
		revisedParts: Array<string>;
		score: number;
	}

	export interface Alternate {
		candidate: string;
		offset: number;
		// Higher numbers indicate the percentage of substitution that follow a
		// particular rule, and I use 100 to indicate no substitution
		commonness: number;
	}

	interface Replacement {
		replacement: string;
		commonness: number;
	}

	export class Helper {
		$: JQueryStatic;
		LZString: LZString.LZStringStatic;
		log: LogLevel.Logger;

		constructor(jquery: JQueryStatic, lzstring: LZString.LZStringStatic, log: LogLevel.Logger) {
			this.$ = jquery;
			this.LZString = lzstring;
			this.log = log;
		}

		private buildDict(words: Array<string>, dict: { [key: string]: boolean }): number {
			for (var i = 0; i < words.length; i++) {
				// duplicates?
				dict[words[i]] = true; // add to dictionary object for optimized lookup
			}
			return words.length;
		}

		// Function to decompress a .txt file that contains correctly-formatted,
		// compressed, dictionary file data
		decompressFile(file: string): Array<string> {
			var a: Array<string>;
			var lzstring = this.LZString;
			this.$.get(file, function (s) {
				var decompressed = lzstring.decompressFromEncodedURIComponent(s);
				a = decompressed.split(",");
			});
			return a;
		}

		// function for loading dictionaries that we use as wordlists
		// REQUIRES: path is a valid path to a txt file
		// REQUIRES: file is formatted such that there is one password per line
		// ENSURES: creates a javascript object from the given file path
		fileToDict(file: string): { [key: string]: boolean } {
			var dict: { [key: string]: boolean } = {};
			var fBuildDict = this.buildDict;
			var log = this.log;
			this.$.get(file, function (s) {
				var words = s.split("\n"); // get as an array
				var added = fBuildDict(words, dict);
				log.debug("Loaded " + added + " words to dictionary.");
			});
			return dict;
		}

		// function for loading dictionaries that we use as wordlists
		toDict(s: string): { [key: string]: boolean } {
			// get string as array of lines
			var words: Array<string> = s.split("\n");
			var dict: { [key: string]: boolean } = {};
			var added: number = this.buildDict(words, dict);

			this.log.debug("Loaded " + added + " words to the dictionary.");
			return dict;
		}

		// function for loading compressed dictionaries that we use as wordlists
		compressedFileToDict(path: string): { [key: string]: boolean } {
			var dict: { [key: string]: boolean } = {};
			var fLZString = this.LZString;
			var fBuildDict = this.buildDict;
			var log = this.log;
			this.$.get(path, function (s) {
				var decompressed = fLZString.decompressFromEncodedURIComponent(s);
				var words: Array<string> = decompressed.split(",");
				var added: number = fBuildDict(words, dict);
				log.debug("Decompressed and loaded " + added + " words to the dictionary.");
			});
			return dict;
		}

		// loads a file (of passwords) to an array
		// REQUIRES: path is a valid path to a txt file
		// REQUIRES: file is formatted such that there is one password per line
		// ENSURES: creates an array from the given file path
		fileToArray(path: string): Array<string> {
			var a: Array<string> = [];
			var log = this.log;
			this.$.get(path, function (s) {
				var pws: Array<string> = s.split("\n");
				for (var i = 0; i < pws.length; i++) {
					a.push(pws[i]);
				}
				log.debug("Loaded" + pws.length + "passwords to an array.");
			});
			return a;
		}

		// Given a regular expression "rx" and an array of 1+ "passwordParts", returns
		// an object whose property "matched" is an array of all 0+ matches it found
		// and whose property "score" is the total number of characters matched (summed across all matches)
		// and whose property "revisedParts" is "parts" with all matches removed.
		// Note that when a match is removed from the middle of a part, it splits that part into 2.
		matchHelper(passwordParts: Array<string>, rx: RegExp): MatchFoo {
			var matched: Array<RegExpMatchArray> = [];
			var revisedParts: Array<string> = [];
			var score = 0;
			for (var i = 0; i < passwordParts.length; i++) {
				var matchResult = passwordParts[i].match(rx);
				if (matchResult) {
					for (var j = 0; j < matchResult.length; j++) {
						score += matchResult[j].length;
						var loc = passwordParts[i].indexOf(matchResult[j]);
						// Check for a match at beginning
						if (loc === 0) {
							passwordParts[i] = passwordParts[i].substring(matchResult[j].length);
						} else { // match in middle or end
							revisedParts.push(passwordParts[i].substring(0, loc));
							passwordParts[i] = passwordParts[i].substring(loc + matchResult[j].length);
						}
					}
					matched = matched.concat(matchResult);
				}
				// Check if it didn't match OR there are leftovers after matching
				if (passwordParts[i].length > 0) {
					revisedParts.push(passwordParts[i]);
				}
			}
			return {
				matched: matched,
				revisedParts: revisedParts,
				score: score
			};
		}

		// Given a "candidate" substring from a password, returns an array of objects, each of which
		// contains alternate strings with substitutions undone and their commonness
		// e.g., Given "m0nkey" this function will return [monkey]
		// Only performs substitutions if there is a letter within the preceding 2 or following 2 characters
		// Currently, we take the 10 most common substitutions.
		// Uncomment relevant parts below for the 20 most common instead.
		// leetspeak characters to reverse: 012345akuyz!&@$
		//o → 0	16.2
		//i → 1	7.6
		//20mostCommon	l → 1	1.7
		//20mostCommon	one → 1	1.2
		//20mostCommon	to → 2	1.7
		//20mostCommon	too → 2	1.4
		//e → 3	12.4
		//for → 4	6.8
		//a → 4	3.1
		//s → 5	2.0
		//20mostCommon	for you → 4u 	0.7
		//20mostCommon	er → a		1.0
		//20mostCommon	c → k		1.2
		//o → u	2.8
		//20mostCommon	i → y		0.8
		//s → z	2.5
		//20mostCommon	i → !	1.5
		//20mostCommon	and → &	0.9
		//a → @	7.8
		//s → $	3.9
		commonSubstitutions(candidate: string): Array<Alternate> {
			var NONALPHA = new RegExp("[^A-Za-z]");
			// List alternate strings with substitutions undone
			var alternates = new Array<Alternate>();
			// Keep track of offsets (how much longer we made the string). 
			// If we replace 5 with s, keep the offset the same. 
			// If we replace 4 with for, add 2 to the offset since it is now 
			// two characters longer
			// Also track the frequency of the *least* common substitution in this string
			var original = {
				'candidate': candidate,
				'offset': 0,
				'commonness': 100
			};
			alternates.push(original);

			// Only substitute if there is a letter within 2 characters 
			// of what we are substituting
			for (var i = 0; i < candidate.length; i++) {
				if ((i >= 1 && this.isALetter(candidate.charAt(i - 1))) ||
					(i >= 2 && this.isALetter(candidate.charAt(i - 2))) ||
					(i < (candidate.length - 1) && this.isALetter(candidate.charAt(i + 1))) ||
					(i < (candidate.length - 2) && this.isALetter(candidate.charAt(i + 2)))) {
					// List possible substitutions
					var replacements = new Array<Replacement>();
					if (candidate.charAt(i) === '0') {
						replacements.push({
							'replacement': "o",
							'commonness': 16.2
						});
					} else if (candidate.charAt(i) === '1') {
						replacements.push({
							'replacement': "i",
							'commonness': 7.6
						});
						//replacements.push({'replacement': "l", 'commonness': 1.7});
						//replacements.push({'replacement': "one", 'commonness': 1.2});
					}
					//else if(candidate.charAt(i)==='2') {
					//	replacements.push({'replacement': "to", 'commonness': 1.7});
					//	replacements.push({'replacement': "too", 'commonness': 1.4});
					//}
					else if (candidate.charAt(i) === '3') {
						replacements.push({
							'replacement': "e",
							'commonness': 12.4
						});
					} else if (candidate.charAt(i) === '4') {
						replacements.push({
							'replacement': "for",
							'commonness': 6.8
						});
						replacements.push({
							'replacement': "a",
							'commonness': 3.1
						});
					} else if (candidate.charAt(i) === '5') {
						replacements.push({
							'replacement': "s",
							'commonness': 2.0
						});
					}
					//else if(candidate.charAt(i)==='u' || candidate.charAt(i)==='U') {
					//	replacements.push({'replacement': "you", 'commonness': 0.7});
					//}
					//else if(candidate.charAt(i)==='a' || candidate.charAt(i)==='A') {
					//	replacements.push({'replacement': "er", 'commonness': 1.0});
					//}
					//else if(candidate.charAt(i)==='k' || candidate.charAt(i)==='K') {
					//	replacements.push({'replacement': "c", 'commonness': 1.2});
					//}
					else if (candidate.charAt(i) === 'u' || candidate.charAt(i) === 'U') {
						replacements.push({
							'replacement': "o",
							'commonness': 2.8
						});
					}
					//else if(candidate.charAt(i)==='y' || candidate.charAt(i)==='Y') {
					//	replacements.push({'replacement': "i", 'commonness': 0.8});
					//}
					else if (candidate.charAt(i) === 'z' || candidate.charAt(i) === 'Z') {
						replacements.push({
							'replacement': "s",
							'commonness': 2.5
						});
					}
					//else if(candidate.charAt(i)==='!') {
					//	replacements.push({'replacement': "i", 'commonness': 1.5});
					//}
					//else if(candidate.charAt(i)==='&') {
					//	replacements.push({'replacement': "and", 'commonness': 0.9});
					//}
					else if (candidate.charAt(i) === '@') {
						replacements.push({
							'replacement': "a",
							'commonness': 7.8
						});
					} else if (candidate.charAt(i) === '$') {
						replacements.push({
							'replacement': "s",
							'commonness': 3.9
						});
					}

					var existingAlternates = alternates.length;
					for (var j = 0; j < existingAlternates; j++) {
						for (var k = 0; k < replacements.length; k++) {
							var subToMake = replacements[k].replacement;
							var newPW = alternates[j].candidate.replaceAt(i + alternates[j].offset, subToMake);
							var howCommon = replacements[k].commonness;
							if (alternates[j].commonness < howCommon) {
								howCommon = alternates[j].commonness;
							}
							var newOffset = alternates[j].offset + replacements[k].replacement.length - 1;
							alternates.push({
								'candidate': newPW,
								'offset': newOffset,
								'commonness': howCommon
							});
						}
					}
				}
			}
			for (var z = alternates.length - 1; z >= 0; z--) {
				if (alternates[z].candidate.match(NONALPHA)) {
					alternates.splice(z, 1);
				}
			}
			return alternates;
		}

		// Given two arrays, a and b, each of *strings in decreasing length order*,
		// returns the longest string that is in both.
		// If there are multiple strings common to both, only returns the first from array a.
		// Not case sensitive.
		sortedOverlap(a: Array<string>, b: Array<string>): string {
			for (var i = 0; i < a.length; i++) {
				for (var j = 0; j < b.length; j++) {
					if (a[i] == b[j]) {
						return a[i];
					}
				}
			}
			return "";
		}

		// Returns true is a character is an uppercase or lowercase letter and false if it is not
		// Expects a single character as input. Returns false if not.
		isALetter(character: string): boolean {
			// Make sure it's a single character
			if (character.length != 1) {
				return false;
			}
			var asciiCode = character.charCodeAt(0);
			if ((asciiCode >= 65 && asciiCode <= 90) || (asciiCode >= 97 && asciiCode <= 122)) {
				return true;
			} else {
				return false;
			}
		}

	}

	export function boldAll(foo: Array<string>) {
		return foo.map(function(x: string): string {
			return "<b>"+x+"</b>";
		});
	}
}