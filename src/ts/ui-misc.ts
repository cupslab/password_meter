import Helper = require("./helper");
import PasswordMeter = require("./PasswordMeter");
import Config = require("./config");
import RuleFunctions = require("./rulefunctions");
import Constants = require("./constants");
import NeuralNetwork = require("./nn-misc");
import LogLevel = require("loglevel");

export module UIMisc {
	export class UIMisc {
		helper: Helper.Helper.Helper;
		$: JQueryStatic;
		log: LogLevel.Logger;

		// Global variable to retain the password when the modal was opened,
		// so that we later know whether or not to show a 'discard' button
		private pwWhenModalOpened: string = "";

		// Global variable indicating whether they ever clicked the concerete suggestion.
		// If so, don't show them another fixed password unless they drop 
		// below the 2/3rds threshold.
		private tookSuggestion: boolean = false;

		// Global variable to store what password's rating is currently shown
		private previouslyRated: string = "";

		// Previously computed information about password scores and feedback
		// To avoid scoring things multiple times, store mappings in associative arrays
		// -1 means that we already spawned a thread to perform this calculation, so don't duplicate it
		// Mapping of passwords to score based on advanced heuristics
		private heuristicMapping: { [key: string]: number } = {};

		// Mapping of passwords to public/sensitive feedback
		// potentialTODO that could get expensivex
		// potentialTODO structure this
		private feedbackMapping: { [key: string]: string } = {};

		// Previously computed information about concrete suggestions
		// Mapping of passwords to a potential concrete suggestion. 
		// If the suggestion is scored highly enough, then store it in fixedpwMapping.
		private recommendedFixes: { [key: string]: string } = {};

		// To avoid excess computation, keep track of how many tries we've made
		// trying to generate a strong concerete suggestion. If too many, 
		// give up rather than potentially cause UI lag.
		private recommendedFixesTries: { [key: string]: number } = {};

		// Keep track of the previous candidate we tried for the concrete suggestion.
		// If insufficiently strong, we'll want to modify it
		private previousCandidate: { [key: string]: string } = {};

		// Final mapping of password to (pre-validated) stronger concrete suggestion
		private fixedpwMapping: { [key: string]: string } = {};

		// How the concrete suggestion was modified from the original (for highlights)
		private deltaHighlighted: { [key: string]: Array<number> } = {};

		// Globally keep track of whether the password is in compliance with the 
		// composition policy. We use this to decide whether to let them continue.
		// We store this in a global to avoid double-calling the function each time.
		private inCompliance: boolean = false;

		// randomly-ordered list of the 4 character classes, for use in feedback
		private randomlyOrderedCharClasses: Array<string> = [];

		constructor() {
			var registry = PasswordMeter.PasswordMeter.instance;
			this.helper = registry.getHelper();
			this.$ = registry.getJquery();
			this.log = registry.getLog();

			// shuffle character classes and store for use in requirements feedback
			// note: we do it here rather than shuffle each time dynamically to avoid
			// confusing user with constantly changing requirements
			var charClasses = ["uppercase letter", "lowercase letter", "digit", "symbol"];
			this.randomlyOrderedCharClasses = charClasses.shuffle();
		}

		getRandomlyOrderedCharClasses(): Array<string> {
			return this.randomlyOrderedCharClasses;
		}

		// return randomly-ordered list of all 4 character classes
		getCharClassStringForCharClassCountReq(): string {
			var pluralalizedCharClasses = this.randomlyOrderedCharClasses.map(x => x + "s");
			return pluralalizedCharClasses.join("; ");
		}

		// return string containing randomly-ordered required character classes
		getCharClassStringForMandatoryCharClassReq(): string {
			var registry = PasswordMeter.PasswordMeter.instance;
			var config: Config.Config.Config = registry.getConfig();
			var requirementString = "";
			for (var i = 0; i < this.randomlyOrderedCharClasses.length; i++) {
				var charClass = this.randomlyOrderedCharClasses[i];
				switch (charClass) {
					case "uppercase letter":
						if (config.classRequire.upperCase) {
							if (requirementString.length > 0) {
								requirementString += " and an uppercase letter";
							} else {
								requirementString = "Contain an uppercase letter";
							}
						}
						break;
					case "lowercase letter":
						if (config.classRequire.lowerCase) {
							if (requirementString.length > 0) {
								requirementString += " and a lowercase letter";
							} else {
								requirementString = "Contain a lowercase letter";
							}
						}
						break;
					case "digit":
						if (config.classRequire.digits) {
							if (requirementString.length > 0) {
								requirementString += " and a digit";
							} else {
								requirementString = "Contain a digit";
							}
						}
						break;
					case "symbol":
						if (config.classRequire.symbols) {
							if (requirementString.length > 0) {
								requirementString += " and a symbol";
							} else {
								requirementString = "Contain a symbol";
							}
						}
						break;
				}
			}

			// mandatory classes should already be shuffled by construction
			return requirementString;
		}

		onReady(): void {
			// Make the non-modal (feedback box) appear
			this.$(".pop").fadeIn();
			// Reset hide/show checkbox in case they reloaded the page
			// and call the function that shows password/******** based on it
			this.$("#showHidePWNonModal").prop("checked", false);
			this.toggleShowHideNonModal();
			// Rate the password in the box (if any)
			this.spawnRating();
		}

		// This function switches between the password being ***** and shown in non-modal
		toggleShowHideNonModal(): void {
			if (this.$("#showHidePWNonModal").prop("checked")) {
				this.$("#pwbox").prop("type", "text");
				this.$("#pwboxModal").prop("type", "text");
				// Make non-modal and modal checkboxes match
				this.$("#showHidePWModal").prop("checked", true);
			} else {
				this.$("#pwbox").prop("type", "password");
				this.$("#pwboxModal").prop("type", "password");
				// Make non-modal and modal checkboxes match
				this.$("#showHidePWModal").prop("checked", false);
			}
			this.spawnRating();
		}

		// This function switches between the password being ***** and shown in modal
		toggleShowHideModal(): void {
			if (this.$("#showHidePWModal").prop("checked")) {
				this.$("#pwbox").prop("type", "text");
				this.$("#pwboxModal").prop("type", "text");
				// Make non-modal and modal checkboxes match
				this.$("#showHidePWNonModal").prop("checked", true);
			} else {
				this.$("#pwbox").prop("type", "password");
				this.$("#pwboxModal").prop("type", "password");
				// Make non-modal and modal checkboxes match
				this.$("#showHidePWNonModal").prop("checked", false);
			}
			this.spawnRating();
		}

		// Function called when the modal window is opened.
		// Save what the password is at this point and transfer 
		// the password from the main window to the modal
		storepw(): void {
			var pw = this.$("#pwbox").val() as string;
			this.pwWhenModalOpened = pw;
			this.$("#pwboxModal").val(pw);
		}

		// Show the discard button in the modal only if they edited the password field
		enableDiscard(): void {
			// If they haven't changed the password since opening the modal
			if (this.$("#pwboxModal").val() === this.pwWhenModalOpened) {
				this.$("#discardButton").hide();
				this.$("#keepButton").html("OK");
			} else {
				this.$("#discardButton").show();
				this.$("#keepButton").html("Keep Changes");
			}
		}

		// They chose to keep their modal-modified password,
		// so transfer it to the main window
		keeppw(): void {
			this.$("#pwbox").val(this.$("#pwboxModal").val());
		}

		// If they click the concrete suggestion in the non-modal, put it in the password field
		fixPWNonModal(): void {
			// Note for later that they have taken a suggestion
			this.tookSuggestion = true;
			var newpw = this.$("#nonmodalFixedPW").text();
			this.$("#pwbox").val(newpw);
			// Update the rating
			this.spawnRating();
		}

		// If they click the concrete suggestion in the modal, put it in the password field
		fixPWModal(): void {
			this.tookSuggestion = true;
			var pw = this.$("#modalFixedPW").text();
			this.$("#pwboxModal").val(pw);
			this.spawnRating();
			this.enableDiscard();
		}

		// Set up the modal when they are initially showing it
		showModal(): void {
			this.storepw();
			this.$("#discardButton").hide();
			this.$("#keepButton").html("OK");
			(this.$("#myModal") as any).modal('show');
		}

		// To save computation, only rate the password if it has changed
		mayberate(): void {
			if (this.$("#pwbox").val() !== this.previouslyRated) {
				this.previouslyRated = this.$("#pwbox").val() as string;
				this.spawnRating();
			}
		}

		// When they try to submit, decide whether to let them continue
		continueCheck(triedToSubmit: boolean): void {
			var compliantOverall = true;
			// Make sure username is non-empty
			if (triedToSubmit) {
				var username = this.$("#usernamebox").val() as string;
				if (username.length < 1) {
					this.$("#usernameTooShort").show();
					compliantOverall = false;
				} else {
					this.$("#usernameTooShort").hide();
				}
			}

			// Check compliance with the password-composition policy
			if (!this.inCompliance) {
				compliantOverall = false;
				// Also hide confirmation error messages
				this.$("#confirmDoesNotMatch").hide();
				// Only turn red when they try to submit
				if (triedToSubmit) {
					this.$("#feedbackHeaderText").css({
						"color": "red",
						"font-weight": "bold"
					});
					this.$("#passwordNonCompliant").show();
				}
			} else {
				// It is in compliance, so turn everything back to normal
				this.$("#feedbackHeaderText").css({
					"color": "",
					"font-weight": ""
				});
				this.$("#passwordNonCompliant").hide();
			}
			// Check that the confirm box matches the password
			var pw = this.$("#pwbox").val() as string;
			var confirm = this.$("#confirmbox").val() as string;
			if (pw !== confirm) {
				compliantOverall = false;
				// Only show the error when they try to submit a compliant pw
				if (triedToSubmit && this.inCompliance) {
					this.$("#confirmDoesNotMatch").show();
				}
			} else {
				this.$("#confirmDoesNotMatch").hide();
			}
			// If meets policy, matches confirm, and they hit submit, let them
			if (triedToSubmit && compliantOverall) {
				// Function is provided outside the meter
				// @ts-ignore
				continueSubmit(pw);
			}
		}

		// translate NN/heuristic guess number to a percentage-based score (based on meter
		// stringency configuration).
		// this will influence meter fill.
		scaleGuessNumByMeterStringencyFactor(guessNum: number): number {
			var registry = PasswordMeter.PasswordMeter.instance;
			var config: Config.Config.Config = registry.getConfig();
			var stringencyScaleFactor: number = config.barFillStringencyScaleFactor;

			if (guessNum > 0) {
				return guessNum * stringencyScaleFactor;
			} else {
				return guessNum;
			}
		}

		// unscale a heuristic/NN score (0-100), which produces a log10 guess number
		// (for NN scores, the resulting NN guess num is conservative; the
		// meter has divided the guess number by a scaling factor)
		unscaleScoreIntoLogGuessNum(score: number): number {
			var registry = PasswordMeter.PasswordMeter.instance;
			var config: Config.Config.Config = registry.getConfig();
			var stringencyScaleFactor: number = config.barFillStringencyScaleFactor;

			if (score > 0) {
				return score / stringencyScaleFactor;
			} else {
				return score;
			}
		}

		// The main function for starting the password-rating process.
		// This function determines whether we've already calculated scores for 
		// a given password using both heuristics and neural networks. 
		// If so, call the function to show results.
		// If not (undefined mappings), change the mappings temporarily to -1 
		// and spawns the ratings. 
		// When those functions return, display will be called via callbacks.
		spawnRating(): void {
			var pw = "";
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			var log = PasswordMeter.PasswordMeter.instance.getLog();
			if (this.$("#myModal").data("bs.modal") && this.$("#myModal").data("bs.modal").isShown) {
				pw = this.$("#pwboxModal").val() as string;
			} else {
				pw = this.$("#pwbox").val() as string;
			}

			// Is there a point to calculate for an empty password?
			// New version of meter depends on calculations taking place
			// to initialize the UI properly
			/*
			if (0 === pw.length) {
				return;
			}
			*/

			var username = this.$("#usernamebox").val() as string;
			var ratingsComplete = 0;
			var nnNum = nni.getNeuralNetNum(pw);
			if (typeof (nnNum) === "undefined") {
				// Signal that we are calculating it to avoid duplicate work
				nni.setNeuralNetNum(pw, -1);
				// Asynchronously calculate neural network guess number
				log.debug("sending " + pw + " to normal client");
				nni.queryGuessNumber(pw, false);
			} else if (nnNum >= 0) {
				ratingsComplete++;
			}
			if (typeof (this.heuristicMapping[pw]) === "undefined") {
				this.queryHeuristicGuessNumber(pw, username, true);
			} else if (this.heuristicMapping[pw] >= 0) {
				ratingsComplete++;
			}
			// If we have both ratings, or neural nets doesn't seem to work
			// on this browser, or the password is empty, display the rating.
			if (pw.length === 0 || !nni.heardFromNn() || ratingsComplete === 2) {
				this.displayRating(pw);
			}
		}

		// This function tries to generate a candidate for the conrete suggestion
		// following randomly chosen modification strategies.
		// It requires the current candidate (pw), the current recursion depth (depth) 
		// to avoid causing lag, and the original version of the password (originalPW)
		generateCandidateFixed(pw: string, depth: number, originalPW: string): number {
			var config = PasswordMeter.PasswordMeter.instance.getConfig();
			if (!config.provideConcretePasswordSuggestions) {
				return 1;
			}

			// We keep a vector that tracks changes we make to the password for 
			// future highlighting purposes.
			var deltas: Array<number> = [];
			// If this is the initial call, initialize that vector
			if (typeof (this.deltaHighlighted[pw]) === "undefined") {
				for (var i = 0; i < pw.length; i++) {
					deltas[i] = 0;
				}
			} else {
				deltas = this.deltaHighlighted[pw];
			}

			// Get the current modification of the password
			var modifiedPW = pw;
			if (typeof (this.previousCandidate[pw]) !== "undefined") {
				// We may have already moved digits or symbols
				modifiedPW = this.previousCandidate[pw];
				deltas = this.deltaHighlighted[modifiedPW];
			}

			// Randomly select one of the strategies in a biased way
			var selection = Math.floor(8 * Math.random());
			// Strategy A: toggle case
			if (selection === 0 || selection === 1) {
				var pwLen = modifiedPW.length;
				var loc = Math.floor(pwLen * Math.random());
				if (modifiedPW.charCodeAt(loc) >= 65 && modifiedPW.charCodeAt(loc) <= 90) {
					modifiedPW = modifiedPW.replaceAt(loc, String.fromCharCode(modifiedPW.charCodeAt(loc) + 32));
					deltas[loc] = 1;
				} else if (modifiedPW.charCodeAt(loc) >= 97 && modifiedPW.charCodeAt(loc) <= 122) {
					modifiedPW = modifiedPW.replaceAt(loc, String.fromCharCode(modifiedPW.charCodeAt(loc) - 32));
					deltas[loc] = 1;
				}
				// Strategy B: substitute character
			} else if (selection === 2 || selection === 3) {
				var char1 = 32 + Math.floor(Math.random() * 95);
				var loc1 = Math.floor((modifiedPW.length) * Math.random());
				if (modifiedPW.charCodeAt(loc1) !== char1) {
					deltas[loc1] = 1;
				}
				modifiedPW = modifiedPW.replaceAt(loc1, String.fromCharCode(char1));
				// Strategy C: insert character
			} else if (selection >= 4) {
				var char1 = 32 + Math.floor(Math.random() * 95);
				var loc1 = Math.floor((modifiedPW.length + 1) * Math.random());
				modifiedPW = modifiedPW.slice(0, loc1) + String.fromCharCode(char1) + modifiedPW.slice(loc1);
				deltas = deltas.slice(0, loc1).concat(1, deltas.slice(loc1));
			}

			// score the candidate in the background, if needed
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			if (typeof (nni.getNeuralNetNum(modifiedPW)) === "undefined") {
				nni.setNeuralNetNum(modifiedPW, -1); // signal that we are calculating it to avoid duplicate work
				nni.queryGuessNumber(modifiedPW, true); // asynchronously calculate neural network guess number
			}

			// Check the modification's compliance with the password-composition policy
			var currentUsername = this.$("#usernamebox").val() as string;

			if (typeof (this.heuristicMapping[modifiedPW]) === "undefined") {
				this.queryHeuristicGuessNumber(modifiedPW, currentUsername, false);
			}

			var verified = RuleFunctions.RuleFunctions.verifyMinimumRequirements(modifiedPW, currentUsername);
			if (verified.compliant) {
				// If it complies with the policy
				this.recommendedFixes[originalPW] = modifiedPW;
				this.deltaHighlighted[modifiedPW] = deltas;
				var log = PasswordMeter.PasswordMeter.instance.getLog();
				log.info("identified " + modifiedPW + " as a potential fix for " + originalPW);
				if (typeof (this.recommendedFixesTries[originalPW]) === "undefined") {
					this.recommendedFixesTries[originalPW] = 1;
				} else {
					this.recommendedFixesTries[originalPW] = this.recommendedFixesTries[originalPW] + 1;
				}
				this.spawnFixedRating(modifiedPW); // score the candidate in the background
				// If it does not comply, recursively calls itself to try again.
			} else {
				depth++;
				if (depth < 8) {
					this.generateCandidateFixed(pw, depth, originalPW);
				}
			}
			return 1;
		}

		// A modification of the main function for starting the password-rating process 
		// that instead works to score a candidate concrete suggestion we've auto-generated.
		// This function determines whether we've already calculated scores for 
		// a given password using both heuristics and neural networks. 
		// If so, call the function to show results.
		// If not (undefined mappings), change the mappings temporarily to -1 
		// and spawn the ratings. 
		// When those functions return, display will be called via callbacks.
		spawnFixedRating(pw: string): void {
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			var log = PasswordMeter.PasswordMeter.instance.getLog();
			var username = this.$("#usernamebox").val() as string;
			if (typeof (this.heuristicMapping[pw]) === "undefined") {
				this.queryHeuristicGuessNumber(pw, username, false);
				// To avoid duplicating call when the heuristic function returns
			} else if (nni.getNeuralNetNum(pw) >= 0 && this.heuristicMapping[pw] >= 0) {
				this.synthesizeFixed(pw);
			}
		}

		// Called when we return new guessing evaluations of a concrete suggestion, 
		// this function synthesizes the results and (if the concrete suggestion is 
		// sufficiently strong) updates the array mapping passwords to suggested ones.
		// It can only synthesize results, though, if both heuristics and neural 
		// networks have returned.
		synthesizeFixed(fixedpw: string): number {
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			var overallScore: number = 0;
			var numberOfScores: number = 0;
			var changedAnyMappings: boolean = false;
			var log = this.log;

			if (typeof (this.heuristicMapping[fixedpw]) !== "undefined"
				&& this.heuristicMapping[fixedpw] >= 0) {
				numberOfScores++;
				overallScore = this.heuristicMapping[fixedpw];
			}
			var nnNum = nni.getNeuralNetNum(fixedpw);
			var nnScoreAsPercent = this.scaleGuessNumByMeterStringencyFactor(nnNum);

			if (typeof (nnNum) !== "undefined"
				&& nnScoreAsPercent >= 0 && isFinite(nnScoreAsPercent)) {
				numberOfScores++;
				if (overallScore === 0
					|| (overallScore > 0 && nnScoreAsPercent < overallScore)) {
					overallScore = nnScoreAsPercent;
				}
			}
			log.debug("result for password: " + fixedpw + " heuristic: "
				+ this.heuristicMapping[fixedpw] + " neuralnet: "
				+ nnScoreAsPercent + " scores: " + numberOfScores);
			// When we have a sufficiently strong concrete suggestion, 
			// find all original passwords that include that as a potential fix 
			// and set it as the mapping
			if (numberOfScores === 2 && overallScore >= 67) {
				log.info(fixedpw + " is a plausible fix above the 2/3rds threshold");
				for (var j in this.recommendedFixes) {
					if (this.recommendedFixes[j] === fixedpw
						&& typeof (this.fixedpwMapping[j]) === "undefined") {
						// Now check to make sure this improves the original password
						var originalOverallScore: number = 0;
						if (typeof (this.heuristicMapping[j]) !== "undefined"
							&& this.heuristicMapping[j] >= 0) {
							originalOverallScore = this.heuristicMapping[j];
						}
						var nnNumFix = nni.getNeuralNetNum(j);
						var nnScoreAsPercentFix = this.scaleGuessNumByMeterStringencyFactor(nnNumFix); // note: heuristicMapping already scaled in queryHeuristicGuessNumber
						if (typeof (nnNumFix) !== "undefined"
							&& nnScoreAsPercentFix >= 0
							&& isFinite(nnScoreAsPercentFix)) {
							// if neural less tha heuristic score, then overall score becomes neural score
							if (originalOverallScore === 0
								|| (originalOverallScore > 0
									&& nnScoreAsPercentFix < originalOverallScore)) {
								originalOverallScore = nnScoreAsPercentFix;
							}
						}
						if (overallScore > (originalOverallScore + 15)) {
							this.fixedpwMapping[j] = fixedpw;
							log.info("mapping " + j + " to " + fixedpw);
							changedAnyMappings = true;
						} else {
							log.info("not mapping " + j + " to " + fixedpw + " because it is not enough of an improvement " + originalOverallScore + " --> " + overallScore);
						}
					}
				}
				// Re-rate things and thus display if we have changed any mappings
				if (changedAnyMappings) {
					this.spawnRating();
				}
				return 1;
			}
			// Try recursively adding more to the password (to a depth), 
			// but only if it's still the current password (avoid extra computation)
			var currentpw = this.$("#pwbox").val() as string;
			// If the modal is open, the current password is actually what's there
			if (this.$("#myModal").data("bs.modal") && this.$("#myModal").data("bs.modal").isShown) {
				currentpw = this.$("#pwboxModal").val() as string;
			}
			if (this.recommendedFixes[currentpw] === fixedpw
				&& numberOfScores === 2
				&& typeof (this.fixedpwMapping[currentpw]) === "undefined"
				&& typeof (this.recommendedFixesTries[currentpw]) !== "undefined"
				&& this.recommendedFixesTries[currentpw] < 8) {
				// Try to generate a better concrete suggestion
				log.info("trying again on " + fixedpw + " as current password is still " + currentpw);
				this.generateCandidateFixed(fixedpw, 0, currentpw);
			}
			return 1;
		}

		// A function used to avoid showing redundant text feedback
		// generated by different scoring functions.
		// Returns true (redundant with previous feedback) or false (not redundant).
		redundant(problemText: string, arrayOfProblems: Array<string>): boolean {
			// Lowercase since some rule functions lowercase feedback
			problemText = problemText.toLowerCase();
			for (var i = 0; i < arrayOfProblems.length; i++) {
				arrayOfProblems[i] = arrayOfProblems[i].toLowerCase();
				if (arrayOfProblems[i].length > 0 && problemText.length > 0) {
					if ((arrayOfProblems[i].indexOf(problemText) >= 0
						&& problemText.length >= 0.7 * arrayOfProblems[i].length)
						|| (problemText.indexOf(arrayOfProblems[i]) >= 0
							&& arrayOfProblems[i].length >= 0.7 * problemText.length)) {
						return true;
					}
				}
			}
			return false;
		}

		// This function calculates the advanced heuristics.
		// It requires the password (pw), the username (username), 
		// and a boolean for which:
		//  *true indicates this is the primary password, so potentially change 
		//	the bar when done calculating
		//  *false indicates we are rating a candidate concrete suggestion
		queryHeuristicGuessNumber(pw: string, username: string, primaryPassword: boolean): void {
			// We overwrite the password if they use contextual or domain-specific content
			// and we need the original to make the correct mappings
			var originalPW = pw;
			var publictips: Array<string> = [];
			var sensitivetips: Array<string> = [];
			var reasonWhy: Array<string> = [];
			var problemText: Array<string> = [];

			// Return JSON objects from all of the rule functions
			var contextualObj = RuleFunctions.RuleFunctions.contextual(pw, [username]);
			pw = contextualObj.remaining;
			// If their whole password is contextual, we hit a type error
			if (typeof (pw) === "undefined") {
				pw = "";
			}
			var domainSpecificObj = RuleFunctions.RuleFunctions.generateDomainSpecificWordsUsageComment(pw);
			pw = domainSpecificObj.remaining;
			// If their whole password is domain-specific, we hit a type error
			if (typeof (pw) === "undefined") {
				pw = "";
			}

			var lenObj = RuleFunctions.RuleFunctions.pwLength(pw);
			var classObj = RuleFunctions.RuleFunctions.characterClasses(pw);
			var duplicatedObj = RuleFunctions.RuleFunctions.duplicatedCharacters(pw);
			var repeatObj = RuleFunctions.RuleFunctions.repeats(pw);
			var patternsObj = RuleFunctions.RuleFunctions.keyboardPatterns(pw);
			var sequenceObj = RuleFunctions.RuleFunctions.repeatedSections(pw);
			var structureObj = RuleFunctions.RuleFunctions.structurePredictable(pw);
			var upperPredictableObj = RuleFunctions.RuleFunctions.uppercasePredictable(pw);
			var digitsPredictableObj = RuleFunctions.RuleFunctions.digitsPredictable(pw);
			var symbolsPredictableObj = RuleFunctions.RuleFunctions.symbolsPredictable(pw);
			var upperObj = RuleFunctions.RuleFunctions.countUC(pw);
			var lowerObj = RuleFunctions.RuleFunctions.countLC(pw);
			var digitObj = RuleFunctions.RuleFunctions.countDIGS(pw);
			var symbolObj = RuleFunctions.RuleFunctions.countSYMS(pw);
			var dateObj = RuleFunctions.RuleFunctions.identifyDates(pw);
			//var minimumObj = RuleFunctions.RuleFunctions.verifyMinimumRequirements(pw, username);
			var alphabeticsequenceObj = RuleFunctions.RuleFunctions.alphabeticSequenceCheck(pw);
			var commonsubstringObj = RuleFunctions.RuleFunctions.commonSubstringCheck(pw);
			var dictionaryCheckObj = RuleFunctions.RuleFunctions.combinedDictCheck(pw);
			var substringArrayNoFilter = pw.listSubstringsNoFilter(4);
			var commonpwObj = RuleFunctions.RuleFunctions.commonPwCheck(substringArrayNoFilter);
			// Take the coefficients from our regression of min-auto on 21 heuristic features
			// (corresponding to subscores elements)
			var coefficients = [1.530, 0.3129, 0.9912, 0.04637,
				-0.03885, -0.1172, -0.2976, -0.0008581, -0.3008, -0.5566,
				0, 0.9108, 0.7369, 0.7578, 0, -0.1213, -0.2402, -0.1364,
				-0.5534, 1.927, 0.001496, -0.3946];
			var subscores: Array<number> = [1, lenObj.length, classObj.count, duplicatedObj.count,
				repeatObj.count, patternsObj.score, sequenceObj.count, structureObj.score,
				upperPredictableObj.score, digitsPredictableObj.score, symbolsPredictableObj.score,
				upperObj.count, lowerObj.count, digitObj.count, symbolObj.count, dateObj.count,
				alphabeticsequenceObj.count, commonsubstringObj.count, dictionaryCheckObj.length,
				dictionaryCheckObj.dictionaryTokens, dictionaryCheckObj.substitutionCommonness,
				commonpwObj.length];
			// The first value is the intercept
			var overallHeuristicScore = coefficients[0];
			// Take the remaining coefficients and multiply by the rule function score
			for (var i = 1; i < coefficients.length; i++) {
				overallHeuristicScore += coefficients[i] * subscores[i];
			}
			overallHeuristicScore = this.scaleGuessNumByMeterStringencyFactor(overallHeuristicScore);
			if (overallHeuristicScore < (pw.length / 2)) {
				overallHeuristicScore = pw.length / 2; // this is heuristics-based, after all
			} else if (overallHeuristicScore > 100) {
				overallHeuristicScore = 100;
			}

			// Save non-empty text feedback from the rule functions
			if (contextualObj.publicText.length > 0) {
				publictips.push(contextualObj.publicText);
				sensitivetips.push(contextualObj.sensitiveText);
				reasonWhy.push(contextualObj.reasonWhy);
				problemText.push(contextualObj.problemText);
			}
			if (domainSpecificObj.publicText.length > 0) {
				publictips.push(domainSpecificObj.publicText);
				sensitivetips.push(domainSpecificObj.sensitiveText);
				reasonWhy.push(domainSpecificObj.reasonWhy);
				problemText.push(domainSpecificObj.problemText);
			}
			if (dictionaryCheckObj.publicText.length > 0
				&& !this.redundant(dictionaryCheckObj.problemText, problemText)) {
				publictips.push(dictionaryCheckObj.publicText);
				sensitivetips.push(dictionaryCheckObj.sensitiveText);
				reasonWhy.push(dictionaryCheckObj.reasonWhy);
				problemText.push(dictionaryCheckObj.problemText);
			}
			if (patternsObj.publicText.length > 0) {
				publictips.push(patternsObj.publicText);
				sensitivetips.push(patternsObj.sensitiveText);
				reasonWhy.push(patternsObj.reasonWhy);
				problemText.push(patternsObj.problemText);
			}
			if (repeatObj.publicText.length > 0) {
				publictips.push(repeatObj.publicText);
				sensitivetips.push(repeatObj.sensitiveText);
				reasonWhy.push(repeatObj.reasonWhy);
				problemText.push(repeatObj.problemText);
			}
			if (dateObj.publicText.length > 0) {
				publictips.push(dateObj.publicText);
				sensitivetips.push(dateObj.sensitiveText);
				reasonWhy.push(dateObj.reasonWhy);
				problemText.push(dateObj.problemText);
			}
			if (sequenceObj.publicText.length > 0) {
				publictips.push(sequenceObj.publicText);
				sensitivetips.push(sequenceObj.sensitiveText);
				reasonWhy.push(sequenceObj.reasonWhy);
				problemText.push(sequenceObj.problemText);
			}
			if (alphabeticsequenceObj.publicText.length > 0) {
				publictips.push(alphabeticsequenceObj.publicText);
				sensitivetips.push(alphabeticsequenceObj.sensitiveText);
				reasonWhy.push(alphabeticsequenceObj.reasonWhy);
				problemText.push(alphabeticsequenceObj.problemText);
			}
			if (commonpwObj.publicText.length > 0 && !this.redundant(commonpwObj.problemText, problemText)) {
				publictips.push(commonpwObj.publicText);
				sensitivetips.push(commonpwObj.sensitiveText);
				reasonWhy.push(commonpwObj.reasonWhy);
				problemText.push(commonpwObj.problemText);
			}
			if (upperPredictableObj.publicText.length > 0) {
				publictips.push(upperPredictableObj.publicText);
				sensitivetips.push(upperPredictableObj.sensitiveText);
				reasonWhy.push(upperPredictableObj.reasonWhy);
				problemText.push(upperPredictableObj.problemText);
			}
			if (digitsPredictableObj.publicText.length > 0) {
				publictips.push(digitsPredictableObj.publicText);
				sensitivetips.push(digitsPredictableObj.sensitiveText);
				reasonWhy.push(digitsPredictableObj.reasonWhy);
				problemText.push(digitsPredictableObj.problemText);
			}
			if (symbolsPredictableObj.publicText.length > 0) {
				publictips.push(symbolsPredictableObj.publicText);
				sensitivetips.push(symbolsPredictableObj.sensitiveText);
				reasonWhy.push(symbolsPredictableObj.reasonWhy);
				problemText.push(symbolsPredictableObj.problemText);
			}
			if (duplicatedObj.publicText.length > 0) {
				publictips.push(duplicatedObj.publicText);
				sensitivetips.push(duplicatedObj.sensitiveText);
				reasonWhy.push(duplicatedObj.reasonWhy);
				problemText.push(duplicatedObj.problemText);
			}
			if (lenObj.publicText.length > 0) {
				publictips.push(lenObj.publicText);
				sensitivetips.push(lenObj.sensitiveText);
				reasonWhy.push(lenObj.reasonWhy);
			}
			if (symbolObj.publicText.length > 0) {
				publictips.push(symbolObj.publicText);
				sensitivetips.push(symbolObj.sensitiveText);
				reasonWhy.push(symbolObj.reasonWhy);
			}
			if (upperObj.publicText.length > 0) {
				publictips.push(upperObj.publicText);
				sensitivetips.push(upperObj.sensitiveText);
				reasonWhy.push(upperObj.reasonWhy);
			}
			if (digitObj.publicText.length > 0) {
				publictips.push(digitObj.publicText);
				sensitivetips.push(digitObj.sensitiveText);
				reasonWhy.push(digitObj.reasonWhy);
			}
			if (lowerObj.publicText.length > 0) {
				publictips.push(lowerObj.publicText);
				sensitivetips.push(lowerObj.sensitiveText);
				reasonWhy.push(lowerObj.reasonWhy);
			}
			if (commonsubstringObj.publicText.length > 0 && !this.redundant(commonsubstringObj.problemText, problemText)) {
				publictips.push(commonsubstringObj.publicText);
				sensitivetips.push(commonsubstringObj.sensitiveText);
				reasonWhy.push(commonsubstringObj.reasonWhy);
			}
			if (structureObj.publicText.length > 0) {
				publictips.push(structureObj.publicText);
				sensitivetips.push(structureObj.sensitiveText);
				reasonWhy.push(structureObj.reasonWhy);
			}

			// Save the mapping of password to heuristic score
			this.heuristicMapping[originalPW] = overallHeuristicScore;
			// Save the mapping of password to feedback
			this.feedbackMapping[originalPW] = JSON.stringify({
				publictips1: publictips[0],
				publictips2: publictips[1],
				publictips3: publictips[2],
				sensitivetips1: sensitivetips[0],
				sensitivetips2: sensitivetips[1],
				sensitivetips3: sensitivetips[2],
				reasonWhy1: reasonWhy[0],
				reasonWhy2: reasonWhy[1],
				reasonWhy3: reasonWhy[2],
			});

			// Display the rating if it's the currently shown (primary) password
			if (primaryPassword) {
				// XXXstroucki we already call displayRating in spawnRating.
				// are both necessary?
				this.displayRating(originalPW);
				// also cache modifications to a fixed password
				if (digitsPredictableObj.fixedPw.length > 0) {
					this.previousCandidate[originalPW] = digitsPredictableObj.fixedPw;
					this.deltaHighlighted[digitsPredictableObj.fixedPw] = digitsPredictableObj.deltas;
				} else if (symbolsPredictableObj.fixedPw.length > 0) {
					this.previousCandidate[originalPW] = symbolsPredictableObj.fixedPw;
					this.deltaHighlighted[symbolsPredictableObj.fixedPw] = symbolsPredictableObj.deltas;
				}
				// Otherwise, we're just scoring a concrete suggestion
			} else {
				this.synthesizeFixed(originalPW);
			}
		}

		// Update all aspects of the UI (bar and text feedback) to reflect password. 
		// Note that the password score and feedback was generated + cached in other functions.
		displayRating(pw: string): void {
			var config: Config.Config.Config = PasswordMeter.PasswordMeter.instance.getConfig();
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			var overallScore = 0;
			var numberOfScores = 0;
			var heuristicScore = this.heuristicMapping[pw];
			var log = this.log;

			var nnNum = nni.getNeuralNetNum(pw);
			var unscaledNnNum = nnNum +
				NeuralNetwork.NeuralNetwork.log10(config.neuralNetworkConfig.guessNumScaleFactor);
			var nnScore = this.scaleGuessNumByMeterStringencyFactor(nnNum);

			if (pw.length > 0) {
				if (typeof (heuristicScore) !== "undefined"
					&& heuristicScore >= 0) {
					numberOfScores++;
				}
				if (typeof (nnNum) !== "undefined"
					&& nnScore >= 0 && isFinite(nnScore)) {
					numberOfScores++;
				}

				// if the min length requirement hasn't been met, the NN score will be 0;
				// use a length-based score metric instead
				var lengthBasedScore = pw.length * (config.minNnScoreToInfluenceBar / config.length.minLength);

				// the NN score should generally be larger then the minNnScoreToInfluenceBar
				// for passwords 8 characters or longer; a really weak password pattern
				// (e.g., "aaaaaaaaaa") is being used. don't let users abuse the
				// length-based score in this way past the point where the NN should take over
				lengthBasedScore = Math.min(lengthBasedScore, config.minNnScoreToInfluenceBar);

				if ((typeof (nnNum) !== "undefined" && nnScore == 0) ||
					nnScore < config.minNnScoreToInfluenceBar) {

					overallScore = lengthBasedScore;

				} else {
					// as long as the NN is working on the client, use it;
					// use the heuristic score as a fallback otherwise
					if (nni.heardFromNn()) {
						overallScore = nnScore;
					} else {
						overallScore = heuristicScore;
					}
				}
			}

			var logstring = pw;
			if (typeof (nnNum) !== "undefined" && nnNum != -1) {
				logstring += " [NN #: " + nnNum.toFixed(2) + "]";
			}
			logstring += " (unscaled: " + unscaledNnNum.toFixed(2) + ")" +
				", NN score: " + nnScore.toFixed(2) +
				", heuristic score: " + heuristicScore.toFixed(2) +
				", overall score: " + overallScore.toFixed(2) + ")";
			log.info(logstring);

			// print debug info
			nni.debugNN(pw, false);

			// Avoid errors in case the feedback mapping was somehow screwed up
			if (typeof (this.feedbackMapping[pw]) === "undefined") {
				this.feedbackMapping[pw] = JSON.stringify({
					publictips1: "",
					publictips2: "",
					publictips3: "",
					sensitivetips1: "",
					sensitivetips2: "",
					sensitivetips3: "",
					reasonWhy1: "",
					reasonWhy2: "",
					reasonWhy3: "",
				});
			}
			var feedback = JSON.parse(this.feedbackMapping[pw]);

			var config = PasswordMeter.PasswordMeter.instance.getConfig();

			var currentUsername = this.$("#usernamebox").val() as string;
			var minReqObj = RuleFunctions.RuleFunctions.verifyMinimumRequirements(pw, currentUsername);
			// If password complies with password policy, show feedback
			if (minReqObj.compliant) {
				this.inCompliance = true;
				if (pw.length === 0 || !nni.heardFromNn() || numberOfScores === 2) {
					this.displayBar(overallScore, true, pw, minReqObj.detail.compliance);
				}
				this.$(".detailedFeedback").show();

				// For the non-modal display
				// Show the button for the password-specific modal
				this.$(".portalToGenericAdviceModal").hide();
				// Show (Why?) buttons that bring people to the modal
				this.$(".explainWhy").show();
				// Show only 3 tips for improving the password
				this.$("#nonmodalRow1").show();
				this.$("#nonmodalRow2").show();
				this.$("#nonmodalRow3").show();
				this.$("#nonmodalRow4").hide();
				this.$("#nonmodalRow5").hide();
				this.$("#nonmodalRow6").hide();
				this.$("#nonmodalRow7").hide();
				this.$("#nonmodalRow8").hide();
				// Also show the confirm password box
				this.$("#confirmpw").show();

				// For the modal display
				// First hide all and then show the relevant ones
				this.$(".modalRow").hide();
				this.$("#modalRow1").show();
				this.$("#modalRow1a").show();
				this.$("#modalRow2").show();
				this.$("#modalRow2a").show();
				this.$("#modalRow3").show();
				this.$("#modalRow3a").show();

				// If we have < 3 pieces of feedback, hide relevant rows
				if (typeof (feedback.publictips3) === "undefined") {
					this.$("#nonmodalRow3").hide();
					this.$("#modalRow3").hide();
					this.$("#modalRow3a").hide();
				}
				if (typeof (feedback.publictips2) === "undefined") {
					this.$("#nonmodalRow2").hide();
					this.$("#modalRow2").hide();
					this.$("#modalRow2a").hide();
				}
				if (typeof (feedback.publictips1) === "undefined") {
					this.$("#nonmodalRow1").hide();
					this.$("#modalRow1").hide();
					this.$("#modalRow1a").hide();
				}

				// Display text heading reflecting the score
				if (overallScore <= 33) {
					var feedbackWeak = "Your password is very easy to guess.";
					this.$("#feedbackHeaderText").html(feedbackWeak);
					this.$("#feedbackHeaderTextModal").html(feedbackWeak);
				} else if (overallScore <= 66) {
					var feedbackLowMedium = "Your password could be better.";
					this.$("#feedbackHeaderText").html(feedbackLowMedium);
					this.$("#feedbackHeaderTextModal").html(feedbackLowMedium);
				} else if (overallScore < 100) {
					var feedbackHighMedium = "Your password is pretty good.";
					if (config.remindAgainstReuse) {
						feedbackHighMedium += " Use it only for this account. <span class='reuseAdvice explainWhy explainWhyColoring' onclick=\"$('#myModalGeneric').modal('show');$('#okGeneric').prop('disabled', false);\" data-target='#myModalGeneric' data-target='#myModal'>(Why?)</span>";
					}
					feedbackHighMedium += "<br><p style='line-height:0.25em;'>&nbsp;</p>To make it even better:";
					this.$("#feedbackHeaderText").html(feedbackHighMedium);
					this.$("#feedbackHeaderTextModal").html(feedbackHighMedium);
				} else {
					var feedbackStrong = "Your password appears strong.";
					if (config.remindAgainstReuse) {
						feedbackStrong += " Make sure you use it only for this account. <span class='reuseAdvice explainWhy explainWhyColoring' onclick=\"$('#myModalGeneric').modal('show');$('#okGeneric').prop('disabled', false);\" data-target='#myModalGeneric' data-target='#myModal'>(Why?)</span>";
					}
					this.$("#feedbackHeaderText").html(feedbackStrong);
					this.$("#feedbackHeaderTextModal").html(feedbackStrong);
				}

				// Show colored boxes taken away when non-compliant with the password policy
				this.$(".nonmodalColorCell").show();
				this.$(".modalColorCell").show();
				this.$(".modalColorCellSpacer").show();

				// Populate table with appropriate feedback
				this.$(".recommended").show();
				// If they are showing their password, use sensitive feedback
				if (this.$("#showHidePWNonModal").prop("checked") === true) {
					this.$(".fixedPWavailablePortal").hide();
					this.$(".concreteSuggestionDiv").show();
					// Non-modal
					this.$("#tipText1").html(feedback.sensitivetips1);
					this.$("#tipText2").html(feedback.sensitivetips2);
					this.$("#tipText3").html(feedback.sensitivetips3);
					// Modal
					this.$("#suggestion1").html(feedback.sensitivetips1);
					this.$("#suggestion2").html(feedback.sensitivetips2);
					this.$("#suggestion3").html(feedback.sensitivetips3);
					this.$("#sensText1").html(feedback.reasonWhy1);
					this.$("#sensText2").html(feedback.reasonWhy2);
					this.$("#sensText3").html(feedback.reasonWhy3);
				} else {
					this.$(".fixedPWavailablePortal").show();
					this.$(".concreteSuggestionDiv").hide();
					// Non-modal
					this.$("#tipText1").html(feedback.publictips1);
					this.$("#tipText2").html(feedback.publictips2);
					this.$("#tipText3").html(feedback.publictips3);
					// Modal
					this.$("#suggestion1").html(feedback.publictips1);
					this.$("#suggestion2").html(feedback.publictips2);
					this.$("#suggestion3").html(feedback.publictips3);
					this.$("#sensText1").html(feedback.reasonWhy1);
					this.$("#sensText2").html(feedback.reasonWhy2);
					this.$("#sensText3").html(feedback.reasonWhy3);
				}

				// Recommend a concrete suggestion if we have one
				if (config.provideConcretePasswordSuggestions &&
					typeof (this.fixedpwMapping[pw]) !== "undefined") {
					// Change colors to highlight what was modified
					var coloredFixedPW = "";
					var whereToColor = this.deltaHighlighted[this.fixedpwMapping[pw]];
					var proposedPassword = this.fixedpwMapping[pw];
					for (var j = 0; j < proposedPassword.length; j++) {
						if (whereToColor[j] === 1) {
							coloredFixedPW += "<span class='deltaHighlights'>" + proposedPassword[j].escapeHTML() + "</span>";
						} else {
							coloredFixedPW += proposedPassword[j].escapeHTML();
						}
					}
					// if we have actually showed the user a concrete password suggestion
					// (if they clicked 'show password with our improvements' or clicked to show
					//  their password in plaintext on the screen), then trigger an event
					if (this.$("#showHidePWNonModal").prop("checked") === true) {
						this.$(".fixedPW").html(coloredFixedPW).trigger("change");
					}
					// If we don't yet have a concrete suggestion
				} else {
					this.$(".recommended").hide();
				}

				// Hide the feedback if the score is high enough
				if (overallScore <= 66) {
					this.$("#nonmodalFeedbackTable").show();
					this.$("#modalFeedbackTable").show();
					this.$(".portalToGenericAdviceModal").show();
				} else if (overallScore < 100) {
					this.$("#nonmodalFeedbackTable").show();
					this.$("#modalFeedbackTable").show();
					this.$(".portalToGenericAdviceModal").show();
					// If they already took a concrete suggestion, don't show another
					if (this.tookSuggestion) {
						this.$(".recommended").hide();
						this.$(".portalToGenericAdviceModal").hide();
					}
				} else {
					this.$("#nonmodalFeedbackTable").hide();
					this.$("#modalFeedbackTable").hide();
					this.$(".recommended").hide();
					// Don't show any modal buttons since score is high
					this.$(".portalToGenericAdviceModal").hide();
				}
				// However, if the password is not yet compliant with the policy
			} else {
				this.inCompliance = false;
				var nni = PasswordMeter.PasswordMeter.instance.getNN();

				if (pw.length === 0 || !nni.heardFromNn() || numberOfScores === 2) {
					this.displayBar(overallScore, false, pw, minReqObj.detail.compliance);
				}
				// Don't let them confirm a non-compliant password
				this.$("#confirmpw").hide();
				this.$(".detailedFeedback").hide();
				// Show the button for the generic modal window
				this.$(".portalToGenericAdviceModal").show();
				// Hide (Why?) buttons that bring people to the specific-advice modal
				this.$(".explainWhy").hide();
				// Explain what doesn't comply
				var requirementsHeader = "";
				var config: Config.Config.Config = PasswordMeter.PasswordMeter.instance.getConfig();
				if (config.remindAgainstReuse) {
					requirementsHeader = "<span style='color:#555555;'>Don't reuse a password from another account!</span> <span class='reuseAdvice explainWhy explainWhyColoring' onclick=\"$('#myModalGeneric').modal('show');$('#okGeneric').prop('disabled', false);\" data-target='#myModalGeneric' data-target='#myModal'>(Why?)</span><br><p style='line-height:0.25em;'>&nbsp;</p>";
				}
				var nonCompliantAdmonition = "Your password <span style='text-decoration: underline;'>must</span>:";
				this.$("#feedbackHeaderText").html(requirementsHeader + nonCompliantAdmonition);
				this.$("#feedbackHeaderTextModal").html(requirementsHeader + nonCompliantAdmonition);
				this.$("#nonmodalFeedbackTable").show();
				this.$(".recommended").hide();

				// Give text feedback about how they fail to comply with policy
				var policyGripes: Array<string> = [];
				var detail = minReqObj.detail;
				for (var metric in detail.compliance) {
					if (!detail.compliance[metric]) {
						policyGripes.push(detail.explanation[metric]);
					}
				}

				// Hide the color cells
				this.$(".nonmodalColorCell").hide();
				this.$(".modalColorCell").hide();
				this.$(".modalColorCellSpacer").hide();
				// Hide all of the rows, and then re-show them as necessary below
				this.$(".nonmodalRow").hide();
				this.$(".modalRow").hide();

				for (var i = 0; i < policyGripes.length; i++) {
					var nmRow = this.$("#nonmodalRow" + (i + 1));
					var tipText = this.$("#tipText" + (i + 1));
					var mRow = this.$("#modalRow" + (i + 1));
					var suggestion = this.$("#suggestion" + (i + 1));
					var gripe = policyGripes[i];

					nmRow.show();
					tipText.html(gripe);
					mRow.show();
					suggestion.html(gripe);
				}
			}

			// Start trying to generate a concrete suggestion
			if (config.provideConcretePasswordSuggestions
				&& (pw.length === 0 || !nni.heardFromNn() || numberOfScores === 2)
				&& minReqObj.compliant && typeof (this.fixedpwMapping[pw]) === "undefined"
				&& overallScore < 100) {
				this.generateCandidateFixed(pw, 0, pw);
			}
		}

		// This function displays the colored bar. It requires the password's score 
		// (expected range 0-100) and a boolean metRequirements indicating yes (true)
		// to display the bar in color or no (false) to display the bar in grayscale 
		// until the requirements have been met.
		displayBar(score: number, metRequirements: boolean, pw: string,
			compliance: { [key: string]: boolean }): void {
			// Adjust score if outside the range
			if (score < 0) {
				score = 0;
			}
			if (score > 100) {
				score = 100;
			}

			// determine bar color
			var scoreProportion = score / 100;
			var barcolor = "rgb(160,160,160)";
			// Initially go from RGB 255,0,0 towards 255,140,0
			if (metRequirements && scoreProportion < 0.45) {
				barcolor = "rgb(" + Math.round(255) + ","
					+ Math.round(scoreProportion / 0.45 * 140) + ",0)";
				// Then go from RGB 255,140,0 towards 255,215,0
			} else if (metRequirements && scoreProportion >= 0.45 && scoreProportion < 0.65) {
				barcolor = "rgb(" + Math.round(255) + ","
					+ Math.round((scoreProportion - 0.45) / 0.20 * 75 + 140) + ",0)";
				// Then go from 255,215,0 towards 50,205,50
			} else if (metRequirements) {
				barcolor = "rgb(" + Math.round(255 - (scoreProportion - 0.65) / 0.35 * 205)
					+ "," + Math.round(215 - (scoreProportion - 0.65) / 0.035) + ",0)";
			}

			// gather info needed for 'change' event
			var nni = PasswordMeter.PasswordMeter.instance.getNN();
			var nnNumScore = this.scaleGuessNumByMeterStringencyFactor(nni.getNeuralNetNum(pw));
			var heuristicScore = this.heuristicMapping[pw];
			var conservativeNnLogGuessNum = nni.getNeuralNetNum(pw);
			var heuristicLogGuessNum = this.unscaleScoreIntoLogGuessNum(this.heuristicMapping[pw])

			// Display bar in main window
			this.$("#cups-passwordmeter-span").css("width", Math.round(298 * score / 100).toString() + "px");
			this.$("#cups-passwordmeter-span").css("background-color", barcolor).trigger(
				"change",
				[score.toString(),
					heuristicScore,
					nnNumScore,
					heuristicLogGuessNum,
					conservativeNnLogGuessNum,
					compliance]);

			// display bar in modal
			this.$("#cups-passwordmeter-span-modal").css("width", Math.round(298 * score / 100).toString() + "px");
			this.$("#cups-passwordmeter-span-modal").css("background-color", barcolor);
		}

		// css interaction
		// potentialTODO this here?
		getMaxOfArray(numArray: Array<number>): number {
			return Math.max.apply(null, numArray);
		}

		expandHelpBut(): void {
			this.$('#expandHelpDiv').show();
			this.$('#helpButton').hide();
		}

		modalShowCheck(): void {
			//checks whether they've checked the box to show their password
			if (this.$("#pwbox").prop("type") == "text") {
				(this.$('#myModal') as any).modal('show');
				this.storepw();
				// potentialTODO what is rate? mayberate? commenting.
				//this.rateModal();
			} else if (this.$('#expandHelpDiv').is(':visible')) {
				(this.$('#myModal') as any).modal('show');
				this.storepw();
				// potentialTODO what is rate? mayberate? commenting.
				//this.rateModal();
			} else {
				this.expandHelpBut();
			}
		}

		closeDiv(divName: string): void {
			this.$(divName).hide();
		}

		// potentialTODO where do the fn params come from?
		deselect(e: JQuery): void {
			if ((this.$.fn as any).slideFadeToggle == undefined) {
				(this.$.fn as any).slideFadeToggle = function (easing: string, callback: Function) {
					return this.animate({
						opacity: 'toggle',
						height: 'toggle'
					}, 'fast', easing, callback);
				};
			}
			// potentialTODO force cast for our defined function
			(<any>this.$('.pop')).slideFadeToggle(function () {
				e.removeClass('selected');
			});
		}

	}

	(function () {
		var registry = PasswordMeter.PasswordMeter.instance;
		var $ = registry.getJquery();
		var instance = new UIMisc();
		registry.setUI(instance);

		$(document).ready(function () {
			$("#showpassword").prop('checked', false);
			$("#showpassword").click(function () {
				document.getElementById("hide-show-label").textContent = "Hide Password";
				$("#cbbutton").css('background-color', '#f5f5f5');
				if ($("#pwbox").prop("type") == "password") {
					$("#pwbox").prop("type", "text");
				} else {
					$("#pwbox").prop("type", "password");
					document.getElementById("hide-show-label").textContent = "Show Password";
					$("#cbbutton").css('background-color', '#f5f5f5');
				}
				// potentialTODO what is rate? mayberate? commenting.
				//rate();
			});
		});

		$(document).ready(function () {
			var pw = $("#pwboxModal");
			$("#tip1, #sensText1").mouseover(function () {
				pw.addClass("problemColor");
			});
			$("#tip2, #sensText2").mouseover(function () {
				pw.addClass("problemColor");
			});
			$("#tip3, #sensText3").mouseover(function () {
				pw.addClass("problemColor");
			});
		});

		$(document).ready(function () {
			instance.onReady();
		});

	}())

}
