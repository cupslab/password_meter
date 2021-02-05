import PasswordMeter = require("./PasswordMeter");
import Config = require("./config");
import Helper = require("./helper");
import Constants = require("./constants");

/* ************** */
/* Rule Functions */
/* ************** */
export module RuleFunctions {
    interface ResultsDetail {
        compliance: { [key: string]: boolean };
        explanation: { [key: string]: string };
    }

    interface VerifyResult {
        compliant: boolean;
        detail: ResultsDetail;
    }

    export function verifyMinimumRequirements(pw: string, username: string): VerifyResult {
        var registry = PasswordMeter.PasswordMeter.instance;
        var config: Config.Config.Config = registry.getConfig();
        var blacklists = registry.getBlacklists();

        var compliantColor = config.colors.compliant;
        var noncompliantColor = config.colors.noncompliant;
        var compliantSymbol = config.symbols.compliant;
        var noncompliantSymbol = config.symbols.noncompliant;

        var explanation: { [key: string]: string } = {};
        var compliance: { [key: string]: boolean } = {};

        if (config.length.active) {
            // requirement: length (min / max)
            var minLength = config.length.minLength;
            var maxLength = config.length.maxLength;
            var compliant = false;
            var thisExplanation = "";

            // explain
            if (maxLength > 0) {
                thisExplanation = "Contain " + minLength.toString() + "-" + maxLength.toString() + " characters";
            } else {
                thisExplanation = "Contain " + minLength.toString() + "+ characters";
            }

            // check
            if (pw.length >= minLength && (pw.length <= maxLength || maxLength === 0)) {
                compliant = true;
            }

            // report
            if (compliant) {
                thisExplanation = "<span style='color:" + compliantColor + "'>" + compliantSymbol + thisExplanation;
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation;
            }
            thisExplanation += "</span>";

            explanation["length"] = thisExplanation;
            compliance["length"] = compliant;
        }

        // prep for character-class requirements
        var hasLowercase = false;
        var hasUppercase = false;
        var hasDigits = false;
        var hasSymbols = false;

        var numClasses = 0;
        // potentialTODO greedy needed?
        if (pw.match(Constants.Constants.LOWERCASE_LETTERS_GLOBAL)) {
            numClasses++;
            hasLowercase = true;
        }
        if (pw.match(Constants.Constants.UPPERCASE_LETTERS_GLOBAL)) {
            numClasses++;
            hasUppercase = true;
        }
        if (pw.match(Constants.Constants.DIGITS_GLOBAL)) {
            numClasses++;
            hasDigits = true;
        }
        if (pw.match(Constants.Constants.SYMBOLS_GLOBAL)) {
            numClasses++;
            hasSymbols = true;
        }

        // requirement: mandatory # of character classes
        if (config.classCount.active) {
            var minCharacterClasses = config.classCount.minCount;
            var maxCharacterClasses = config.classCount.maxCount;
            var thisExplanation = "";
            var compliant = false;

            // explain
            if (maxCharacterClasses === 4) {
                thisExplanation = "Use " + minCharacterClasses.toString() + "+ of the following: ";
            } else {
                thisExplanation = "Use " + minCharacterClasses.toString() + "-" + maxCharacterClasses.toString() + " of the following: ";
            }

            if (config.randomizeOrderCharClassRequirement) {
                var ui = PasswordMeter.PasswordMeter.instance.getUI();
                thisExplanation += ui.getCharClassStringForCharClassCountReq();
            } else {
                thisExplanation += "uppercase letters; lowercase letters; digits; symbols";
            }

            // check
            if (numClasses >= minCharacterClasses && numClasses <= maxCharacterClasses) {
                compliant = true;
            }

            // report
            if (compliant) {
                thisExplanation = "<span style='color:" + compliantColor + "'>" + compliantSymbol + thisExplanation;
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation;
            }
            thisExplanation = thisExplanation += "</span>";

            explanation["classCount"] = thisExplanation;
            compliance["classCount"] = compliant;
        }

        // requirement: mandatory character classes
        if (config.classRequire.active) {
            var uppercaseLettersRequired = config.classRequire.upperCase;
            var lowercaseLettersRequired = config.classRequire.lowerCase;
            var digitsRequired = config.classRequire.digits;
            var symbolsRequired = config.classRequire.symbols;

            var thisExplanation = "";
            var compliant = false;

            // explain
            if (config.randomizeOrderCharClassRequirement) {
                var ui = PasswordMeter.PasswordMeter.instance.getUI();
                thisExplanation += ui.getCharClassStringForMandatoryCharClassReq();
            } else {
                if (lowercaseLettersRequired) {
                    if (thisExplanation.length > 0) {
                        thisExplanation += " and a lowercase letter";
                    } else {
                        thisExplanation = "Contain a lowercase letter";
                    }
                }
                if (uppercaseLettersRequired) {
                    if (thisExplanation.length > 0) {
                        thisExplanation += " and an uppercase letter";
                    } else {
                        thisExplanation = "Contain an uppercase letter";
                    }
                }
                if (digitsRequired) {
                    if (thisExplanation.length > 0) {
                        thisExplanation += " and a digit";
                    } else {
                        thisExplanation = "Contain a digit";
                    }
                }
                if (symbolsRequired) {
                    if (thisExplanation.length > 0) {
                        thisExplanation += " and a symbol";
                    } else {
                        thisExplanation = "Contain a symbol";
                    }
                }
            }

            // assert thisExplanation contains something?
            // not setting at least one required class is an error

            // check
            if ((!lowercaseLettersRequired || hasLowercase) &&
                (!uppercaseLettersRequired || hasUppercase) &&
                (!digitsRequired || hasDigits) &&
                (!symbolsRequired || hasSymbols)) {
                compliant = true;
            }

            // report
            if (compliant) {
                thisExplanation = "<span style='color:" + compliantColor + "'>" + compliantSymbol + thisExplanation;
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation;
            }
            thisExplanation = thisExplanation += "</span>";

            explanation["classRequire"] = thisExplanation;
            compliance["classRequire"] = compliant;

        }

        // requirement: forbidden character classes
        if (config.classAllow.active) {
            var uppercaseLettersPermitted = config.classAllow.upperCase;
            var lowercaseLettersPermitted = config.classAllow.lowerCase;
            var digitsPermitted = config.classAllow.digits;
            var symbolsPermitted = config.classAllow.symbols;

            var thisExplanation = "";
            var compliant = false;

            // explain
            if (!lowercaseLettersPermitted) {
                if (thisExplanation.length > 0) {
                    thisExplanation += " or lowercase letters";
                } else {
                    thisExplanation = "Not include lowercase letters";
                }
            }
            if (!uppercaseLettersPermitted) {
                if (thisExplanation.length > 0) {
                    thisExplanation += " or uppercase letters";
                } else {
                    thisExplanation = "Not include uppercase letters";
                }
            }
            if (!digitsPermitted) {
                if (thisExplanation.length > 0) {
                    thisExplanation += " or digits";
                } else {
                    thisExplanation = "Not include digits";
                }
            }
            if (!symbolsPermitted) {
                if (thisExplanation.length > 0) {
                    thisExplanation += " or symbols";
                } else {
                    thisExplanation = "Not include symbols";
                }
            }

            // assert something must not be allowed

            // check
            if ((lowercaseLettersPermitted || !hasLowercase) &&
                (uppercaseLettersPermitted || !hasUppercase) &&
                (digitsPermitted || !hasDigits) &&
                (symbolsPermitted || !hasSymbols)) {
                compliant = true;
            }

            // report
            if (compliant) {
                thisExplanation = "<span style='color:" + compliantColor + "'>" + compliantSymbol + thisExplanation;
            } else {
                // now explain what specific, forbidden characters they used
                var forbiddenCharactersUsed: Array<string> = [];
                if (!lowercaseLettersPermitted && hasLowercase) {
                    forbiddenCharactersUsed = forbiddenCharactersUsed.concat(pw.match(Constants.Constants.LOWERCASE_LETTERS));
                }
                if (!uppercaseLettersPermitted && hasUppercase) {
                    forbiddenCharactersUsed = forbiddenCharactersUsed.concat(pw.match(Constants.Constants.UPPERCASE_LETTERS));
                }
                if (!digitsPermitted && hasDigits) {
                    forbiddenCharactersUsed = forbiddenCharactersUsed.concat(pw.match(Constants.Constants.DIGITS));
                }
                if (!symbolsPermitted && hasSymbols) {
                    forbiddenCharactersUsed = forbiddenCharactersUsed.concat(pw.match(Constants.Constants.SYMBOLS));
                }
                // remove duplicates and turn spaces into words
                forbiddenCharactersUsed = forbiddenCharactersUsed.removeDuplicates();
                var spaceLocation = forbiddenCharactersUsed.indexOf(" ");
                if (spaceLocation > -1) {
                    forbiddenCharactersUsed[spaceLocation] = "[space]";
                }
                thisExplanation += " (You used <b>" + forbiddenCharactersUsed.join("</b>, <b>") + "</b>)";

                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation;
            }
            thisExplanation = thisExplanation += "</span>";

            explanation["classAllow"] = thisExplanation;
            compliance["classAllow"] = compliant;
        }

        // requirement: blacklist / forbidden passwords
        if (config.blacklist.active) {
            var thisExplanation = "";
            var compliant = false;

            // explain
            thisExplanation = "Not be an extremely common password";

            var isBlacklisted = false;

            // check
            if (pw.length > 0) {

                var stringToCheck = pw; // default is case-sensitive fullstring
                if (config.blacklist.stripDigitsSymbolsFromPassword) {
                    stringToCheck = stringToCheck.replace(/[^a-zA-Z]/gi, '');
                }
                if (!config.blacklist.caseSensitive) {
                    stringToCheck = stringToCheck.toLowerCase();
                }
            }
            isBlacklisted = blacklists.blacklistRejects(stringToCheck);
            compliant = !isBlacklisted ||
                pw.length === 0 ||
                (config.blacklist.lengthException != -1 && pw.length >= config.blacklist.lengthException)

            // report
            // note that we are only complaining about disallowed passwords if they use one
            if (compliant) {
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation + "</span>";

            }

            if (!compliant) {
                explanation["blacklist"] = thisExplanation;
            }
            compliance["blacklist"] = compliant;
        }

        // requirement: forbidden/permitted characters
        if (config.forbidChars.active) {
            var forbiddenChars = config.forbidChars.list;
            var thisExplanation = "";
            var compliant = false;

            // explain
            thisExplanation = "Not include the following characters: " + disallowedChars;
            // note that we are only complaining about disallowed characters if they use one
            // potentialTODO we apparently also check for ASCII

            // check
            var pwUnique = pw.removeDuplicateChars();
            var disallowedChars = "";

            for (var i = 0; i < pwUnique.length; i++) {
                if (pwUnique.charCodeAt(i) < Constants.Constants.startASCII ||
                    pwUnique.charCodeAt(i) > Constants.Constants.endASCII ||
                    forbiddenChars.indexOf(pwUnique.charAt(i)) >= 0) {
                    disallowedChars += pwUnique.charAt(i);
                }
            }
            if (disallowedChars.length === 0) {
                compliant = true;
            }

            // report
            if (compliant) {
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation + "</span>";
            }

            if (!compliant) {
                explanation["forbidChars"] = thisExplanation;
            }
            compliance["forbidChars"] = compliant;
        }

        // requirement: repeated consecutive characters
        if (config.repeatChars.active) {
            var repeatedCharsLimit = config.repeatChars.limit;
            var thisExplanation = "";
            var compliant = false;

            // explain
            thisExplanation = "Not repeat the same character " + repeatedCharsLimit.toString() + "+ times in a row";
            // check
            var charsRepeatedConsecutively: Array<string> = [];
            for (var j = (repeatedCharsLimit - 1); j < pw.length; j++) {
                var testString = pw.substring(j - repeatedCharsLimit + 1, j + 1);
                var testUnique = testString.removeDuplicateChars();
                if (testUnique.length === 1) {
                    charsRepeatedConsecutively.push(testUnique);
                }
            }
            if (charsRepeatedConsecutively.length == 0) {
                compliant = true;
            }

            // report
            if (compliant) {
                thisExplanation = "<span style='color:" + compliantColor + "'>" + compliantSymbol + thisExplanation;

            } else {
                thisExplanation += " (<b>" + charsRepeatedConsecutively.removeDuplicates().join("</b>, <b> ") + "</b>)";
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation;

            }
            thisExplanation += "</span>";

            explanation["repeatChars"] = thisExplanation;
            compliance["repeatChars"] = compliant;
        }

        // requirement: password - username comparison
        if (config.usernameDifference.active) {
            var differenceFromUsername = config.usernameDifference.limit;
            var thisExplanation = "";
            var compliant = false;

            // explain
            thisExplanation = "Not base your password around your username";

            //check
            var pwcopy = pw.toLowerCase();
            var usernamecopy = username.toLowerCase();
            // remove all occurrences of username
            while (usernamecopy.length > 0 && pwcopy.indexOf(usernamecopy) > -1) {
                pwcopy = pwcopy.substr(0, pwcopy.indexOf(usernamecopy)) +
                    pwcopy.substr(pwcopy.indexOf(usernamecopy) + usernamecopy.length);
            }
            if (usernamecopy.length == 0 || pw.length == 0 || pwcopy.length >= differenceFromUsername) {
                compliant = true;
            }

            // report
            if (compliant) {
            } else {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation + "</span>";
            }

            if (!compliant) {
                explanation["usernameDifference"] = thisExplanation;
            }
            compliance["usernameDifference"] = compliant;
        }

        // requirement: min NN guess number requirement (by log10)
        if (config.minLogNnGuessNum.active) {
            var compliant = false;
            var thisExplanation = "";
            var minLogNnGuessNum = config.minLogNnGuessNum.threshold;
            var nni = PasswordMeter.PasswordMeter.instance.getNN();
            var conservativeNnNum = nni.getNeuralNetNum(pw);

            // check
            if (conservativeNnNum < 0) {
                log.debug("(still) looking up NN guess number: " + pw);
            } else if (conservativeNnNum > minLogNnGuessNum) {
                compliant = true;
                log.debug("high enough NN guess number: " + pw + " (" + conservativeNnNum +
                    " > " + minLogNnGuessNum + ")");
            } else {
                log.debug("too low NN guess number: " + pw + " (" + conservativeNnNum +
                    " < " + minLogNnGuessNum + ")");
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + config.minLogNnGuessNum.rejectionFeedback;
            }

            if (!compliant) {
                explanation["minLogNnGuessNum"] = thisExplanation;
            }
            compliance["minLogNnGuessNum"] = compliant;
        }


        // requirement: same character (repeated in password, including non-consecutive repetition)
        if (config.sameChars.active) {
            var sameCharsLimit = config.sameChars.limit;
            var thisExplanation = "";
            var compliant = false;

            // explain
            if (pw.length >= config.sameChars.lengthException || (satisfiesMaxChar(pw, sameCharsLimit))) {
                compliant = true;
            }
            else {
                thisExplanation = "Not contain the same character more than " + sameCharsLimit.toString() + "+ times";
            }

            // report (only explain if violate requirement)
            if (!compliant) {
                thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation + "</span>";
                explanation["sameChars"] = thisExplanation;
            }
            compliance["sameChars"] = compliant;
        }

        // requirement: prohibit previously-known leaked passwords
        if (config.prohibitKnownLeaked.active) {
            // explain
            var thisExplanation = "Not use a password found in previous security leaks";

            // check
            var compliant = false;
            // prohibit perviously-known leaked passwords
            if (config.prohibitKnownLeaked.active) {

                var compliant = false;
                var thisExplanation = "";

                if (pw.length < config.prohibitKnownLeaked.smallestLength || !blacklists.previouslyLeaked(pw)) {
                    compliant = true;
                } else {
                    compliant = false;
                }

                // report
                if (compliant) {
                } else {
                    thisExplanation = "<span style='color:" + noncompliantColor + "'>" + noncompliantSymbol + thisExplanation + "</span>";
                }

                if (!compliant) {
                    explanation["usernameDifference"] = thisExplanation;
                }
                compliance["prohibitKnownLeaked"] = compliant;
            }
        }

        // potentialTODO reduce operation
        var overallCompliance: boolean = true;
        for (const item in compliance) {
            overallCompliance = overallCompliance && compliance[item];
            if (!overallCompliance) break;
        }

        var ret: VerifyResult = <VerifyResult>{
            compliant: overallCompliance,
            detail: {
                compliance: compliance,
                explanation: explanation,
            }
        };

        return ret;
    }

    // helper function to determine if a password satisfies a max-char requirement
    // for a given threshold
    function satisfiesMaxChar(pw: string, maxAllowed: number): boolean {
        var pwChars: { [key: string]: number } = {};
        for (var i = 0; i < pw.length; i++) {
            var pwChar = pw.charAt(i);
            if (pwChar in pwChars) {
                pwChars[pwChar] = pwChars[pwChar] + 1;
                if (pwChars[pwChar] > maxAllowed) {
                    return false;
                }
            } else {
                pwChars[pwChar] = 1;
            }
        }
        return true;
    }

    interface PwLengthComment {
        length: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
    }

    export function pwLength(pw: string): PwLengthComment {
        /* return the number of characters in the pw along with commentary */
        var length: number = pw.length;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";

        var config: Config.Config.Config = PasswordMeter.PasswordMeter.instance.getConfig();
        // potentialTODO active?
        var maxLength = config.length.maxLength;
        // only recommend if they can add 4+ characters without hitting the maximum length, if any
        if (length < 16 && (maxLength === 0 || length < (maxLength - 3))) {
            if (length < 10) {
                reasonWhy = "Attackers are very good at guessing passwords under 10 characters even if the passwords look random";
                publicText = "Make your password longer";
                sensitiveText = "Make your password longer than " + length + " characters";
            } else if (length <= 12) {
                reasonWhy = "Attackers are very good at guessing passwords containing 12 characters or fewer";
                publicText = "Make your password longer";
                sensitiveText = "Make your password longer than " + length + " characters";
            } else {
                reasonWhy = "In recent years, attackers have gotten much better at guessing passwords under 16 characters";
                publicText = "Consider making your password longer";
                sensitiveText = "Consider making your password longer than " + length + " characters";

            }
        }

        return {
            length: length,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
        };
    }

    interface UppercaseCountComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        fixedPw: string;
    }
    export function countUC(pw: string): UppercaseCountComment {
        /* Return a count of uppercase letters */
        var uppercaseCount = 0;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var fixedPW = "";
        var config = PasswordMeter.PasswordMeter.instance.getConfig();
        // potentialTODO active?
        var uppercaseLettersPermitted = config.classAllow.upperCase;
        for (var i = 0; i < pw.length; i++) {
            if (pw.charCodeAt(i) >= 65 && pw.charCodeAt(i) <= 90) {
                uppercaseCount++;
            }
        }
        if (uppercaseCount < (0.15 * pw.length) && uppercaseLettersPermitted) {
            publicText = "Consider using more uppercase letters";
            sensitiveText = "Consider using ";
            sensitiveText += (uppercaseCount + 1).toString() + " or more uppercase letters";
            reasonWhy = "Uppercase letters are surprisingly uncommon in passwords, which makes them hard to guess";
            var char1 = 65 + Math.floor(Math.random() * 26); // add an uppercase letter somewhere
            var loc1 = Math.floor(1 + Math.random() * (pw.length - 1)); // don't make it the first or last character since so many pws have that
            fixedPW = pw.slice(0, loc1) + String.fromCharCode(char1) + pw.slice(loc1);
        }
        return {
            count: uppercaseCount,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            fixedPw: fixedPW
        }
    }

    interface LowercaseCountComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        fixedPw: string;
    }
    export function countLC(pw: string): LowercaseCountComment {
        /* Return a count of lowercase letters */
        var lowercaseCount = 0;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var fixedPW = "";
        var config = PasswordMeter.PasswordMeter.instance.getConfig();

        // potentialTODO active?
        var lowercaseLettersPermitted = config.classAllow.lowerCase;
        for (var i = 0; i < pw.length; i++) {
            if (pw.charCodeAt(i) >= 97 && pw.charCodeAt(i) <= 122) {
                lowercaseCount++;
            }
        }
        if (lowercaseCount < (0.15 * pw.length) && lowercaseLettersPermitted) {
            reasonWhy = "Having variety in the types of characters you use makes your password harder to guess";
            publicText = "Consider using more lowercase letters";
            sensitiveText = "Consider using ";
            sensitiveText += (lowercaseCount + 1) + " or more lowercase letters";
            var char1 = 97 + Math.floor(Math.random() * 26); // add a lower letter somewhere
            var loc1 = Math.floor(1 + Math.random() * (pw.length - 1)); // don't make it the first or last character since so many pws have that
            fixedPW = pw.slice(0, loc1) + String.fromCharCode(char1) + pw.slice(loc1);
        }

        return {
            count: lowercaseCount,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            fixedPw: fixedPW
        }
    }

    interface DigitsCountComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
    }
    export function countDIGS(pw: string): DigitsCountComment {
        /* Return a count of digits */
        var digitCount = 0;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var config = PasswordMeter.PasswordMeter.instance.getConfig();
        // potentialTODO active?
        var digitsPermitted = config.classAllow.digits;
        for (var i = 0; i < pw.length; i++) {
            if (pw.charCodeAt(i) >= 48 && pw.charCodeAt(i) <= 57) {
                digitCount++;
            }
        }
        if (digitCount < (0.15 * pw.length) && digitsPermitted) {
            publicText = "Consider using more digits";
            reasonWhy = "Most passwords contain no digits or digits in predictable places; doing otherwise makes your password harder to guess";
            sensitiveText = "Consider using ";
            sensitiveText += (digitCount + 1) + " or more digits";
        }

        return {
            count: digitCount,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
        }
    }

    interface SymbolsCountComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
    }
    export function countSYMS(pw: string): SymbolsCountComment {
        /* Return a count of symbols (non-alphanumeric characters) */
        /* Remove alphanumeric characters and return the length of what's left */
        var symbolCount = pw.replace(/[A-Za-z0-9]/g, "").length;;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var config = PasswordMeter.PasswordMeter.instance.getConfig();
        // potentialTODO active?
        var symbolsPermitted = config.classAllow.symbols;

        if (symbolCount < (0.15 * pw.length) && symbolsPermitted) {
            publicText = "Consider using more symbols";
            reasonWhy = "Few passwords contain symbols, which makes passwords with symbols harder to guess";
            sensitiveText = "Consider using ";
            sensitiveText += (symbolCount + 1) + " or more symbols";
        }

        return {
            count: symbolCount,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText
        }
    }

    interface CharacterClassesComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
    }
    export function characterClasses(pw: string) {
        /* count: number of classes in pw */
        var numClasses = 0;
        var unusedClass = "";

        if (pw.match(Constants.Constants.LOWERCASE_LETTERS)) {
            numClasses++;
        }
        if (pw.match(Constants.Constants.UPPERCASE_LETTERS)) {
            numClasses++;
        }
        if (pw.match(Constants.Constants.DIGITS)) {
            numClasses++;
        }
        if (pw.match(Constants.Constants.SYMBOLS)) {
            numClasses++;
        }

        var count = numClasses;
        var publicText = "";
        var problematic = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";

        var config = PasswordMeter.PasswordMeter.instance.getConfig();
        // potentialTODO active?
        var allow = config.classAllow;
        /* Case: only lowercase letters */
        if (!pw.match(Constants.Constants.UPPERCASE_LETTERS) &&
            !pw.match(Constants.Constants.DIGITS) &&
            !pw.match(Constants.Constants.SYMBOLS)) {
            // generate suggestion that complies with composition policy
            var allowed = [];
            var allowedjoined = "";
            if (allow.symbols) {
                allowed.push("symbols");
            }
            if (allow.digits) {
                allowed.push("digits");
            }
            if (allow.upperCase) {
                allowed.push("uppercase letters");
            }

            allowedjoined = allowed.toHumanString();

            publicText = "Add " + allowedjoined + " in unpredictable locations";
            sensitiveText = "Add " + allowedjoined + " in unpredictable locations";
            problemText = "";
            reasonWhy = "38% of passwords contain only lowercase letters, making them easy for attackers to guess";
        }
        /* Case: only letters, no numbers or symbols */
        else if (!pw.match(Constants.Constants.DIGITS) &&
            !pw.match(Constants.Constants.SYMBOLS)) {
            // generate suggestion that complies with composition policy
            var allowed = [];
            var allowedjoined = "";
            if (allow.symbols) {
                allowed.push("symbols");
            }
            if (allow.digits) {
                allowed.push("digits");
            }

            allowedjoined = allowed.toHumanString();
            publicText = "Add " + allowedjoined + " in unpredictable locations";
            sensitiveText = "Add " + allowedjoined + " in unpredictable locations";
            problemText = "";
            reasonWhy = "42% of passwords contain only letters, making them easy for attackers to guess";
        }
        /* Case: only lowercase letters and digits, no uppercase letters or symbols */
        else if (!pw.match(Constants.Constants.UPPERCASE_LETTERS) &&
            !pw.match(Constants.Constants.SYMBOLS)) {
            // generate suggestion that complies with composition policy
            var allowed = [];
            var allowedjoined = "";
            if (allow.symbols) {
                allowed.push("symbols");
            }
            if (allow.upperCase) {
                allowed.push("uppercase letters");
            }

            allowedjoined = allowed.toHumanString();
            publicText = "Add " + allowedjoined + " in unpredictable locations";
            sensitiveText = "Add " + allowedjoined + " in unpredictable locations";
            problemText = "";
            reasonWhy = "42% of passwords contain only lowercase letters and number, making them easy for attackers to guess";
        }
        /* Case: no symbols */
        else if (!pw.match(Constants.Constants.SYMBOLS)) {
            if (allow.symbols) {
                publicText = "Add symbols in unpredictable locations";
                sensitiveText = "Add symbols in unpredictable locations";
                problemText = "";
                reasonWhy = "Because only 1% of passwords use symbols, adding them unpredictably strengthens your password";
            }
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText
        }
    }

    interface UppercasePredictableComment {
        score: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        fixedPw: string;
        problemText: string;
    }
    export function uppercasePredictable(pw: string): UppercasePredictableComment {
        /* Evaluate whether uppercase letters are in predictable locations */
        // score is 1 if first letter or all letters are capitalized
        var score = 0;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var problemText = "";
        var fixedPW = "";
        if (pw.charAt(0) === pw.charAt(0).toUpperCase() && pw.charAt(0) !== pw.charAt(0).toLowerCase()) {
            // first character is uppercase; now determine if there are others
            var allbutfirstchar = pw.substr(1);
            if (allbutfirstchar === allbutfirstchar.toLowerCase()) { // no others
                score = 1;
                publicText = "Capitalize a letter in the middle";
                sensitiveText = "Capitalize a letter in the middle, rather than the first character";
                problemText = pw.charAt(0).escapeHTML();
                reasonWhy = "30% of people also capitalize only the first character";

                var llLocations = new Array<number>(); // find locations of lowercase letters
                for (var i = 0; i < pw.length; i++) {
                    if (pw.charCodeAt(i) >= 97 && pw.charCodeAt(i) <= 122) {
                        llLocations.push(i);
                    }
                }
                var placeToUppercase = Math.floor(Math.random() * llLocations.length);
                fixedPW = pw.substring(0, llLocations[placeToUppercase]);
                fixedPW += pw.charAt(llLocations[placeToUppercase]).toUpperCase();
                fixedPW += pw.substring(llLocations[placeToUppercase] + 1);
            }

        }
        // test if 'all uppercase' (at least 3 characters are uppercase and there are no lowercase letters)
        if (pw.search(/[a-z]/) == -1) {
            var pwNoUppercase = pw.replace(/[A-Z]/g, ""); // delete all uppercase characters...
            if (pw.length >= (pwNoUppercase.length + 3)) { // ...and see if password is now 3+ characters shorter
                score = 1;
                publicText = "Mix up your capitalization";
                sensitiveText = "Mix up your capitalization, rather than capitalizing everything";
                reasonWhy = "21% of passwords also contain only uppercase letters";
                var ulLocations = new Array<number>(); // find locations of uppercase letters
                for (var i = 0; i < pw.length; i++) {
                    if (pw.charCodeAt(i) >= 65 && pw.charCodeAt(i) <= 90) {
                        ulLocations.push(i);
                    }
                }
                var placeToLowercase = Math.floor(Math.random() * ulLocations.length);
                fixedPW = pw.substring(0, ulLocations[placeToLowercase]);
                fixedPW += pw.charAt(ulLocations[placeToLowercase]).toLowerCase();
                fixedPW += pw.substring(ulLocations[placeToLowercase] + 1);
            }
        }

        return {
            score: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            fixedPw: fixedPW,
            problemText: problemText
        }
    }

    interface DigitsPredictableComment {
        score: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        fixedPw: string;
        problemText: string;
        deltas: Array<number>;
    }
    export function digitsPredictable(pw: string): DigitsPredictableComment {
        /* Evaluate whether digits are in predictable locations */
        /* score 1 if yes */
        /* score 0 otherwise */
        var score = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var fixedPW = "";
        var deltas: Array<number> = []; // we use this to annotate where we've changed things in our fixedpw

        var NONDIGITS = new RegExp("[^0-9]");
        // potentialTODO requires following nondigits
        var DIGITSFIRST = new RegExp("^[0-9]+[^0-9]+$");
        var DIGITSLAST = new RegExp("^[^0-9]+[0-9]+$");

        if (pw.length >= 4 && !pw.match(NONDIGITS)) { // check if all digits (35.3% do so)
            score = 1;
            publicText = "Add more letters and symbols to your password";
            sensitiveText = "Add characters other than digits to your password";
            problemText = pw.escapeHTML();
            reasonWhy = "35% of people also use only digits";

            // potentialTODO what classes do we allow?
            // choose a random non-digit
            var char1 = 58 + Math.floor(Math.random() * (126 - 58));

            var loc1 = Math.floor(1 + Math.random() * (pw.length - 1)); // don't make it the first or last character since so many pws have that
            fixedPW = pw.slice(0, loc1) + String.fromCharCode(char1) + pw.slice(loc1);
            for (var i = 0; i < fixedPW.length; i++) {
                deltas[i] = 0;
            }
            deltas[loc1] = 1;
        } else if (pw.length >= 4 && pw.match(DIGITSFIRST)) { // check if digits first (9.7% do so)
            score = 1;
            sensitiveText = "Consider inserting digits into the middle, not just at the beginning";
            publicText = "Consider inserting digits into the middle";
            reasonWhy = "10% of people also put digits at the beginning of the password";
            var firstNonDigit = 1; // find first non-digit
            while (pw.charCodeAt(firstNonDigit) >= 48 && pw.charCodeAt(firstNonDigit) <= 57) {
                firstNonDigit++;
            }
            problemText = pw.slice(0, firstNonDigit).escapeHTML();
            // move digits somewhere in the middle
            var loc1 = Math.floor(firstNonDigit + 1 + Math.random() * (pw.length - firstNonDigit - 1));
            fixedPW = pw.slice(firstNonDigit, loc1) + pw.slice(0, firstNonDigit) + pw.slice(loc1);
            for (var i = 0; i < (loc1 - firstNonDigit); i++) {
                deltas[i] = 0;
            }
            for (var i = (loc1 - firstNonDigit); i < loc1; i++) {
                deltas[i] = 1;
            }
            for (var i = loc1; i < fixedPW.length; i++) {
                deltas[i] = 0;
            }
        } else if (pw.length >= 4 && pw.match(DIGITSLAST)) { // check if digits last (38.2% do so)
            score = 1;
            sensitiveText = "Consider inserting digits into the middle, not just at the end";
            publicText = "Consider inserting digits into the middle";
            reasonWhy = "38% of people also put digits at the end of the password";
            var lastNonDigit = pw.length - 2; // find last non-digit
            while (pw.charCodeAt(lastNonDigit) >= 48 && pw.charCodeAt(lastNonDigit) <= 57) {
                lastNonDigit--;
            }
            problemText = pw.slice(lastNonDigit + 1).escapeHTML();
            // move digits somewhere in the middle
            var loc1 = Math.floor(1 + Math.random() * (pw.length - lastNonDigit - 1));
            fixedPW = pw.slice(0, loc1) + pw.slice(lastNonDigit + 1) + pw.slice(loc1, lastNonDigit + 1);
            for (var i = 0; i < loc1; i++) {
                deltas[i] = 0;
            }
            for (var i = loc1; i < (loc1 + pw.slice(lastNonDigit + 1).length); i++) {
                deltas[i] = 1;
            }
            for (var i = (loc1 + <number>pw.slice(lastNonDigit + 1).length); i < fixedPW.length; i++) {
                deltas[i] = 0;
            }
        }

        return {
            score: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            fixedPw: fixedPW,
            problemText: problemText,
            deltas: deltas
        }

    }

    interface SymbolsPredictableComment {
        score: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        fixedPw: string;
        problemText: string;
        deltas: Array<number>;
    }
    export function symbolsPredictable(pw: string): SymbolsPredictableComment {
        /* Evaluate whether symbols are in predictable locations */
        /* score 1 if yes */
        /* score 0 otherwise */
        var score = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var fixedPW = "";
        var deltas: Array<number> = []; // we use this to annotate where we've changed things in our fixedpw

        var LETTERSSYMBOLSDIGITS = new RegExp("^[A-Za-z]+[^0-9A-Za-z]+[0-9]+$");
        var SYMBOLSLAST = new RegExp("^[0-9A-Za-z]+[^0-9A-Za-z]+$");
        var SYMBOLS = new RegExp("[^0-9A-Za-z]+");

        if (pw.length >= 4 && pw.match(LETTERSSYMBOLSDIGITS)) { // check if letters-symbols-digits (13.8% do so)
            score = 1;
            sensitiveText = "Move symbols and digits earlier, rather than just at the end";
            publicText = "Move symbols and digits elsewhere in your password";
            problemText = (pw.match(SYMBOLS))[0].escapeHTML();
            reasonWhy = "14% of people also use letters, followed by symbols, followed by digits";
            var startOfSymbols = pw.search(SYMBOLS); // find start of symbols
            // XXXstroucki why are we overwriting problemText?
            problemText = pw.slice(startOfSymbols).escapeHTML();
            // move symbols somewhere in the middle
            var loc1 = Math.floor(1 + Math.random() * (startOfSymbols - 1));
            fixedPW = pw.slice(0, loc1) + pw.slice(startOfSymbols) + pw.slice(loc1, startOfSymbols);
            for (var i = 0; i < (loc1); i++) {
                deltas[i] = 0;
            }
            for (var i = loc1; i < (loc1 + pw.slice(startOfSymbols).length); i++) {
                deltas[i] = 1;
            }
            for (var i = <number>(loc1 + pw.slice(startOfSymbols).length); i < fixedPW.length; i++) {
                deltas[i] = 0;
            }
        } else if (pw.length >= 4 && pw.match(SYMBOLSLAST)) { // check if symbols last (16.2% do so)
            score = 1;
            sensitiveText = "Move your symbols earlier, rather than just at the end";
            publicText = "Move symbols and digits elsewhere in your password";
            reasonWhy = "16% of people also put symbols only at the end of the password";
            var startOfSymbols = pw.search(SYMBOLS); // find start of symbols
            problemText = pw.slice(startOfSymbols).escapeHTML();
            // move symbols somewhere in the middle
            var loc1 = Math.floor(1 + Math.random() * (startOfSymbols - 1));
            fixedPW = pw.slice(0, loc1) + pw.slice(startOfSymbols) + pw.slice(loc1, startOfSymbols);
            for (var i = 0; i < (loc1); i++) {
                deltas[i] = 0;
            }
            for (var i = loc1; i < (loc1 + pw.slice(startOfSymbols).length); i++) {
                deltas[i] = 1;
            }
            for (var i = <number>(loc1 + pw.slice(startOfSymbols).length); i < fixedPW.length; i++) {
                deltas[i] = 0;
            }
        }

        return {
            score: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            fixedPw: fixedPW,
            problemText: problemText,
            deltas: deltas
        }
    }

    interface KeyboardPatternsComment {
        score: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function keyboardPatterns(pwUnfiltered: string): KeyboardPatternsComment {
        /* return the number of characters contained in a keyboard pattern.
        if there are non-consecutive keyboard patterns (e.g., qwert621asdfg),
        return the sum of all characters involved in a keyboard pattern */
        pwUnfiltered = pwUnfiltered.toLowerCase(); // for ease of checking, lowercase password
        var numCharsPattern = 0;
        //var ourmap = [["`","1","2","3","4","5","6","7","8","9","0","-" ,"=",""  ],
        //		    ["", "q","w","e","r","t","y","u","i","o","p","[" ,"]","\\"],
        //		    ["", "a","s","d","f","g","h","j","k","l",";","\'","" ,""  ],
        //		    ["", "z","x","c","v","b","n","m",",",".","/",""  ,"" ,""  ]];

        // potentialTODO pairs are row, column
        var keyboard: { [key: string]: Array<number> } = {
            "a": [2, 1],
            "b": [3, 5],
            "c": [3, 3],
            "d": [2, 3],
            "e": [1, 3],
            "f": [2, 4],
            "g": [2, 5],
            "h": [2, 6],
            "i": [1, 8],
            "j": [2, 7],
            "k": [2, 8],
            "l": [2, 9],
            "m": [3, 7],
            "n": [3, 6],
            "o": [1, 9],
            "p": [1, 10],
            "q": [1, 1],
            "r": [1, 4],
            "s": [2, 2],
            "t": [1, 5],
            "u": [1, 7],
            "v": [3, 4],
            "w": [1, 2],
            "x": [3, 2],
            "y": [1, 6],
            "z": [3, 1],
            "0": [0, 10],
            "1": [0, 1],
            "2": [0, 2],
            "3": [0, 3],
            "4": [0, 4],
            "5": [0, 5],
            "6": [0, 6],
            "7": [0, 7],
            "8": [0, 8],
            "9": [0, 9],
            "`": [0, 0],
            "~": [0, 0],
            "!": [0, 1],
            "@": [0, 2],
            "#": [0, 3],
            "$": [0, 4],
            "%": [0, 5],
            "^": [0, 6],
            "&": [0, 7],
            "*": [0, 8],
            "(": [0, 9],
            ")": [0, 10],
            "-": [0, 11],
            "_": [0, 11],
            "=": [0, 12],
            "+": [0, 12],
            "[": [1, 11],
            "{": [1, 11],
            "]": [1, 12],
            "}": [1, 12],
            "|": [1, 13],
            "\\": [1, 13],
            ";": [2, 10],
            ":": [2, 10],
            "'": [2, 11],
            '"': [2, 11],
            ",": [3, 8],
            "<": [3, 8],
            ".": [3, 9],
            ">": [3, 9],
            "/": [3, 10],
            "?": [3, 10],
            " ": [4, 5],
        }

        // remove any characters from pwUnfiltered whose positions on the keyboard are unknown
        var pw = "";
        for (var i = 0; i < pwUnfiltered.length; i++) {
            if (typeof keyboard[pwUnfiltered.charAt(i)] !== 'undefined') {
                pw += pwUnfiltered.charAt(i);
            }
        }

        var keyvectors = new Array<string>();
        for (var i = 1; i < pw.length; i++) {
            var deltax = keyboard[pw.charAt(i)][0] - keyboard[pw.charAt(i - 1)][0];
            var deltay = keyboard[pw.charAt(i)][1] - keyboard[pw.charAt(i - 1)][1];
            keyvectors[i - 1] = deltax.toString() + "," + deltay.toString();
        }
        var ALLDIGITS = new RegExp("^[0-9]+$");
        // find *longest* series of identical vectors... this is the longest pattern
        var longestmatchstart = 0;
        var longestmatchlength = 0;
        var seriesvector = "none";
        var currentstart = 0;
        for (var i = 0; i < keyvectors.length; i++) {
            // potentialTODO we have the inter-key vectors in keyvectors now
            var vector = keyvectors[i];
            if (vector === seriesvector) {
                // continuing the series
            } else {
                // a new vector, save the data of the old series if necessary
                if (i - currentstart > longestmatchlength) {
                    // longer than what we've seen so far, so save info

                    // original wanted to ignore key repeats?
                    if (vector !== "0,0") {
                        longestmatchstart = currentstart;
                        longestmatchlength = i - currentstart;
                    }
                }
                // now start a new series
                currentstart = i;
            }
            /* potentialTODO ???
            if (keyvectors[i] !== seriesvector) { // end of match
                if ((i - currentstart) > longestmatchlength &&
                !pw.substring(currentstart, currentstart + i - currentstart + 1).match(ALLDIGITS) &&
                seriesvector !== "0,0") {
                    // longer than previous long match, and also not all digits,
                    // and also not just repetition of the same character (0,0 vector)
                    longestmatchlength = i - currentstart;
                    longestmatchstart = currentstart;
                }
                currentstart = i;
                seriesvector = keyvectors[i];
            } else if (i === (keyvectors.length - 1)) {
                // not end of match, but end of pw... we need to include final character
                if ((i - currentstart + 1) > longestmatchlength &&
                !pw.substring(currentstart, currentstart + i - currentstart + 1).match(ALLDIGITS) &&
                seriesvector !== "0,0") {
                    // longer than previous long match, and also not all digits,
                    // and also not just repetition of the same character (0,0 vector)
                    longestmatchlength = i - currentstart + 1;
                    longestmatchstart = currentstart;
                }
            }
            */
        }
        var score = longestmatchlength + 1; // these are the inter-key jumps, so add 1 to get length of string
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        if (score >= 4) { // if keyboard pattern of at least 4 characters
            problemText = pw.substring(longestmatchstart, longestmatchstart + longestmatchlength + 1).escapeHTML();
            publicText = "Avoid using a pattern on your keyboard";
            sensitiveText = "Avoid using a pattern on your keyboard like <b>" + problemText + "</b>";
            reasonWhy = "Because keyboard patterns are very common in passwords, attackers know to guess them";
        }

        if (score < 3) {
            score = 0;
        }

        return {
            score: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface DuplicatedCharactersComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function duplicatedCharacters(pw: string): DuplicatedCharactersComment {
        /* returns the total number of characters that are duplicates of characters
        used previously in the password. The repetition of characters does not need to
        be consecutive. For instance, ``zcbm'' contains 0 duplicated characters,
        ``zcbmcb'' contains 2 duplicated characters, and ``zcbmbb'' also contains 2
        duplicated characters. */
        var pw_arr = pw.split('');

        var uniques = pw_arr.removeDuplicates();

        var count = pw.length - uniques.length;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var problemText = "";
        if ((uniques.length <= 1 / 2 * pw.length) && uniques.length <= 5) {
            problemText = "";
            publicText = "Have more variety in the characters you choose";
            var pluralSuffix = "";
            if (uniques.length > 1) {
                pluralSuffix = "s";
            }
            var sensitiveText = "Have more variety than repeating the same " + uniques.length +
                " character" + pluralSuffix + " (" + Helper.Helper.boldAll(uniques.sort()).toHumanString() + ")";
            reasonWhy = "Passwords that use only a few different characters are easy for " +
                "attackers to guess";
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface RepeatedSectionsComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function repeatedSections(pw: string): RepeatedSectionsComment {
        // Checks pw for both mirrored and repeated sequences
        // Returns # characters duplicated (e.g., cmucmu returns 3, while cmucmucmu returns 6)
        // In text, gives the longest sequence (either repeated or mirrored) of length 3+

        var count = 0; // how many characters were repeated
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var backwards = false;

        pw = pw.toLowerCase(); // don't want this to be case sensitive
        var pwLength = pw.length;
        for (var len = Math.floor(pwLength / 2); len >= 3; len--) {
            // go through decreasing lengths, as long as at least 3 chars remain
            for (var start = 0; start <= (pwLength - len); start++) {
                var currentForwards = pw.substring(start, start + len);
                var currentBackwards = currentForwards.split("").reverse().join("");
                for (var i = 0;
                    (i + len) <= start; i++) { // look before the substring was extracted
                    if (pw.substring(i, i + len) === currentForwards) {
                        count += len;
                        problemText = currentForwards.escapeHTML();
                    } else if (pw.substring(i, i + len) === currentBackwards) {
                        count += len;
                        problemText = currentForwards.escapeHTML();
                        backwards = true;
                    }
                }
                for (var i = (start + len);
                    (i + len) <= pwLength; i++) { // after substring was extracted
                    if (pw.substring(i, i + len) === currentForwards) {
                        count += len;
                        problemText = currentForwards.escapeHTML();
                    } else if (pw.substring(i, i + len) === currentBackwards) {
                        count += len;
                        problemText = currentForwards.escapeHTML();
                        backwards = true;
                    }
                }
                if (count >= 3) { // we found a repeated section, so don't look for more
                    if (count >= 4) { // only complain to user about slightly longer matches
                        publicText = "Avoid repeating sections";
                        sensitiveText = "Avoid repeating sections (<b>" + problemText + "</b>)";
                        reasonWhy = "In their guessing, attackers know to try duplicating parts of the password";
                        if (backwards) {
                            publicText += ", forwards or backwards";
                            sensitiveText += ", forwards or backwards";
                        }
                    } else {
                        problemText = "";
                    }
                    break;
                }
            }
            if (count > 0) { // we found a repeated section, so don't look for more
                break;
            }
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface RepeatsComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function repeats(pw: string): RepeatsComment {
        /* returns the number of characters in the longest string of at least 3+
        consecutive, repeated characters (e.g., ``monkeeey'' returns 3, while
        ``monkeey'' returns 0) in the password */
        var temp;
        var length = pw.length;
        var most_repeats = 1;
        var current_repeats = 1;
        var most_repeated = "";

        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";

        for (var i = 1; i < length; i++) {
            if (pw[i - 1] == pw[i]) {
                current_repeats++;
                if (current_repeats > most_repeats) {
                    most_repeats = current_repeats;
                    most_repeated = pw[i];
                }
            } else {
                // not a match, reset
                current_repeats = 1;
            }
        }

        var count = most_repeats;
        if (most_repeats >= 3) {
            publicText = "Don't repeat the same character many times in a row";
            for (var j = 0; j < count; j++) {
                problemText += most_repeated;
            }
            problemText = problemText.escapeHTML();
            sensitiveText = "Don't repeat the same character (<b>" + problemText + "</b>) many times in a row";
            reasonWhy = "Hitting the same key over and over adds little to your password's strength";
        }

        if (count === 1) {
            count = 0;
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }

    }

    interface ContextualComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
        remaining: string;
    }
    export function contextual(pw: string, form_data: Array<string>): ContextualComment {
        /* Takes a pw and an array of contextual form_data strings (e.g., from username field)
           Returns the length of the longest string of characters in the password that are from the context */
        var count = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var remaining = pw; // the password after contextual information, if any, has been removed

        // first lowercase context and passwords. do not, however, remove special chars or anything
        for (var i = 0; i < form_data.length; i++) {
            form_data[i] = form_data[i].toLowerCase();
        }
        // we don't care if <4 chars overlap
        var contextStrings = form_data.listSubstringsMinMax(5, undefined);
        var pwSubstrings = [pw.toLowerCase()].listSubstringsMinMax(5, undefined);
        var _helper = PasswordMeter.PasswordMeter.instance.getHelper();
        var longestOverlap = _helper.sortedOverlap(pwSubstrings, contextStrings);

        if (longestOverlap.length >= 5) {
            count = longestOverlap.length;
            problemText = longestOverlap.escapeHTML();
            publicText = "Don't use your account information in your password";
            sensitiveText = "Don't use your account information (<b>" + problemText + "</b>) in your password";
            reasonWhy = "Attackers know to guess your username and email address as part of your password";
            var offendingStringLocation = pw.indexOf(longestOverlap);
            if (offendingStringLocation > -1) {
                remaining = pw.substr(0, offendingStringLocation) + pw.substr(offendingStringLocation + longestOverlap.length);
            }
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText,
            remaining: remaining
        }
    }

    interface CommonSubstringComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function commonSubstringCheck(pw: string): CommonSubstringComment {
        /* this function should, given a password, return the number of characters in the
        password that are common substrings in passwords. */

        var count = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";

        var matchedSubstrings = new Array();

        pw = pw.toLowerCase();
        const commonSubstrings = Constants.Constants.commonSubstrings;
        for (var i = 0; i < commonSubstrings.length; i++) {
            while (pw.indexOf(commonSubstrings[i]) != -1) {
                matchedSubstrings.push(commonSubstrings[i]);
                // put a space in there since no substrings contain one
                // potentialTODO why not a nonprinting char?
                pw = pw.replace(commonSubstrings[i], " ");
            }
        }

        if (matchedSubstrings.length > 0) {
            publicText = "Avoid strings of characters commonly found in passwords";
            var collapsed = matchedSubstrings.join(" </b>and<b> ");
            sensitiveText = "Avoid strings of characters commonly found in passwords like <b>" +
                collapsed + "</b>";
            reasonWhy = "Even if they don't make sense, these strings of characters show up in " +
                "many passwords, which makes them bad to use in yours.";
            problemText = matchedSubstrings[0].escapeHTML(); // zzz for now just give first one
            for (var j = 0; j < matchedSubstrings.length; j++) {
                count += matchedSubstrings[j].length;
            }
        }

        return {
            count: count,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface CommonPwComment {
        length: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function commonPwCheck(listofSS: Array<string>): CommonPwComment {
        /* this function should, given a list of password substrings
        return the length of the longest match on this list (case insensitive). */

        var dict = PasswordMeter.PasswordMeter.instance.getDictionaries().passwordsDict;
        var reasonWhy = "Attackers frequently use other people's common passwords as a starting point for their guesses";

        for (var i = 0; i < listofSS.length; i++) {
            if (dict[listofSS[i]]) {
                // dictionary entries are booleans
                var publicText = "Avoid using very common passwords as part of your own password";
                var sensitiveText = "Avoid using very common passwords like <b>" + listofSS[i] + "</b> as part of your own password";
                var problemText = listofSS[i].escapeHTML();
                var length = listofSS[i].length;
                // only one is enough
                return {
                    length: length,
                    reasonWhy: reasonWhy,
                    publicText: publicText,
                    sensitiveText: sensitiveText,
                    problemText: problemText
                }
            }
        }
        return {
            length: 0,
            reasonWhy: reasonWhy,
            publicText: "",
            sensitiveText: "",
            problemText: ""
        }
    }

    interface DomainSpecificWordsUsageComment {
        length: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
        remaining: string;
    }
    export function generateDomainSpecificWordsUsageComment(pw: string): DomainSpecificWordsUsageComment {
        /* this function should, given a password and a set of site-specific words,
        return the number of characters in the password that are on that list of words */

        var config = PasswordMeter.PasswordMeter.instance.getConfig();
        var helper = PasswordMeter.PasswordMeter.instance.getHelper();
        var domainSpecificWords = config.domainSpecificWords;

        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var remaining = pw; // the password with any domain specific words removed

        var wordsTheyShouldNotHaveUsed: Array<string> = [];
        var NONALPHA = new RegExp("[^A-Za-z]");

        // lowercase and split the password:
        pw = pw.toLowerCase();

        // remove characters that could delimit words
        pw = pw.replace(/[-_ ]/g, "");

        // remove characters that could delimit words
        pw = pw.replace(/[-_ ]/g, "");

        // split password into parts that might contain dictionary
        // words post-substitution; discard non-letters that won't be
        // reverse substituted
        var pwParts = pw.split(/[^a-z01345@$]+/);
        pwParts = pwParts.filter(function (e) { // this removes empty strings, etc.
            return e
        });

        // returns substrings in descending order of length
        var listofSS = pwParts.listSubstringsMinMax(1, undefined);

        var i = 0; // loop variable that we will sometimes reset when we re-populate this list
        while (i < listofSS.length) {
            var foundMatch = "";

            var variantsToLookUp = new Array<Helper.Helper.Alternate>();
            // don't try common substitutions for long passwords; the number of variants
            // adds up and may cause the code to hang

            // potentialTODO magic number 14
            if (listofSS[i].match(NONALPHA) && pw.length <= 14) {
                variantsToLookUp = helper.commonSubstitutions(listofSS[i]);

            } else {
                variantsToLookUp.push({
                    candidate: listofSS[i],
                    offset: 0,
                    commonness: 100
                });
            }
            for (var z = 0; z < variantsToLookUp.length; z++) {
                var currentVariant = variantsToLookUp[z].candidate;
                // in each case, look up the variant, but push the unedited text back to the user
                if (domainSpecificWords.indexOf(currentVariant) > -1) {
                    wordsTheyShouldNotHaveUsed.push(listofSS[i]);
                    foundMatch = listofSS[i];
                }
            }

            if (foundMatch.length > 0) {
                if (problemText.length == 0) { // zzz currently only taking longest. fix later
                    problemText = listofSS[i].escapeHTML();
                }
                // remove the matched substring from password parts.
                for (var z = 0; z < pwParts.length; z++) {
                    var ssLocation = pwParts[z].indexOf(foundMatch);
                    if (ssLocation > -1) {
                        // remove; leave remainder of string
                        pwParts.splice(z, 1, pwParts[z].substring(0, ssLocation),
                            pwParts[z].substring(ssLocation + foundMatch.length));
                        pwParts = pwParts.filter(function (e) {
                            return e
                        });
                        break;
                    }
                }
                var listofSS = pwParts.listSubstringsMinMax(1, foundMatch.length);
                foundMatch = "";
                i = 0;
            } else {
                i++;
            }
        }

        // generate list of word choices to complain to the user about
        var length = 0; // keep track of how many characters were in a wordlist
        var complaintTokens = 0; // keep track of how many separate tokens (words) were used

        if (wordsTheyShouldNotHaveUsed.length > 0) {
            publicText = "Don't use site-specific terms in your password";
            for (var i = 0; i < wordsTheyShouldNotHaveUsed.length; i++) {
                length += wordsTheyShouldNotHaveUsed[i].length;
                complaintTokens++;
                var offendingStringLocation = remaining.indexOf(wordsTheyShouldNotHaveUsed[i]);
                if (offendingStringLocation > -1) {
                    remaining = remaining.substr(0, offendingStringLocation) +
                        remaining.substr(offendingStringLocation +
                            wordsTheyShouldNotHaveUsed[i].length);
                }
            }
            sensitiveText = "Don't use site-specific terms (" +
                Helper.Helper.boldAll(wordsTheyShouldNotHaveUsed.removeDuplicates()).toHumanString() + ")";
            reasonWhy = "Attackers target their attacks to words used on a particular service";
        }

        return {
            length: length,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText,
            remaining: remaining
        }
    }

    interface DictCheckComment {
        length: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
        dictionaryTokens: number;
        substitutionCommonness: number;
    }
    export function combinedDictCheck(pw: string): DictCheckComment {
        /* Note: when creating the dictionaries, be sure that they are disjoint!
        This function assumes they are. Also assumes dictionary entries all contain at
        least 4 characters. Assumes all dictionaries contain only lowercase letters.
        Therefore, look for common passwords in another function. */

        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var commonness = 100; // how common the most common substitution is. 100 indicates no substitution
        var RIGHTWARDS_ARROW = " &#x2192; "; // RIGHTWARDS_ARROW

        // arrays of the words to complain to users about
        var petnameArray = new Array<string>();
        var phraseArray = new Array<string>();
        var nameArray = new Array<string>();
        var wikipediaArray = new Array<string>();
        var englishwordArray = new Array<string>();

        var registry = PasswordMeter.PasswordMeter.instance;
        var dictionaries = registry.getDictionaries();
        var helper = registry.getHelper();
        var transformationArray = new Array();
        var transformationArrayUnedited = new Array(); // store just the transformed version... use this for counting the length of the word, not the prior, which contains explanatory text
        // end

        // split the password:
        pw = pw.replace(/[-_ ]/g, ""); // remove characters that could delimit words
        var pwParts = pw.split(/[^A-Za-z012345!&@$]+/); // split password into parts that might contain dictionary words post-substitution; discard non-letters that won't be reverse substituted
        pwParts = pwParts.filter(function (e) {
            return e
        });
        // this removes empty strings, etc.
        var listofSS = pwParts.listSubstringsMinMax(4, undefined);
        // returns substrings in descending order of length

        // loop variable that we will sometimes reset when we re-populate this list
        var i = 0;
        while (i < listofSS.length) {
            var foundMatch = "";

            var variantsToLookUp = new Array<Helper.Helper.Alternate>();
            var lowercasedSS = listofSS[i].toLowerCase();
            if (lowercasedSS.match(Constants.Constants.NONALPHA) && pw.length <= 14) { // don't try common substitutions for long passwords; the number of variants adds up and may cause the code to hang
                variantsToLookUp = helper.commonSubstitutions(lowercasedSS);

            } else {
                variantsToLookUp.push({
                    'candidate': lowercasedSS,
                    'offset': 0,
                    'commonness': 100
                });
            }
            for (var z = 0; z < variantsToLookUp.length; z++) {
                var currentVariant = variantsToLookUp[z].candidate;
                var currentCommonness = variantsToLookUp[z].commonness;
                // in each case, look up the variant, but push the unedited text back to the user
                // potentialTODO can these be coalesced?
                if (dictionaries.petnames[currentVariant]) {
                    if (variantsToLookUp[z].commonness === 100) {
                        petnameArray.push(listofSS[i]);
                    } else {
                        transformationArray.push(currentVariant + " " + RIGHTWARDS_ARROW + " " + listofSS[i]);
                        transformationArrayUnedited.push(listofSS[i]);
                    }
                    foundMatch = listofSS[i];
                    if (currentCommonness < commonness) {
                        commonness = currentCommonness;
                    }
                } else if (dictionaries.phrasesDict[currentVariant]) {
                    if (variantsToLookUp[z].commonness === 100) {
                        phraseArray.push(listofSS[i]);
                    } else {
                        transformationArray.push(currentVariant + " " + RIGHTWARDS_ARROW + " " + listofSS[i]);
                        transformationArrayUnedited.push(listofSS[i]);
                    }
                    foundMatch = listofSS[i];
                    if (currentCommonness < commonness) {
                        commonness = currentCommonness;
                    }
                } else if (dictionaries.namesDict[currentVariant]) {
                    if (variantsToLookUp[z].commonness === 100) {
                        nameArray.push(listofSS[i]);
                    } else {
                        transformationArray.push(currentVariant + " " + RIGHTWARDS_ARROW + " " + listofSS[i]);
                        transformationArrayUnedited.push(listofSS[i]);
                    }
                    foundMatch = listofSS[i];
                    if (currentCommonness < commonness) {
                        commonness = currentCommonness;
                    }
                } else if (dictionaries.wikipediaDict[currentVariant]) {
                    if (variantsToLookUp[z].commonness === 100) {
                        wikipediaArray.push(listofSS[i]);
                    } else {
                        transformationArray.push(currentVariant + RIGHTWARDS_ARROW + listofSS[i]);
                        transformationArrayUnedited.push(listofSS[i]);
                    }
                    foundMatch = listofSS[i];
                    if (currentCommonness < commonness) {
                        commonness = currentCommonness;
                    }
                } else if (dictionaries.englishwordsDict[currentVariant]) {
                    if (variantsToLookUp[z].commonness === 100) {
                        englishwordArray.push(listofSS[i]);
                    } else {
                        transformationArray.push(currentVariant + RIGHTWARDS_ARROW + listofSS[i]);
                        transformationArrayUnedited.push(listofSS[i]);
                    }
                    foundMatch = listofSS[i];
                    if (currentCommonness < commonness) {
                        commonness = currentCommonness;
                    }
                }
            }

            if (foundMatch.length > 0) {
                if (problemText.length == 0) {
                    problemText = listofSS[i].escapeHTML();
                }
                // remove the matched substring from password parts.
                for (var z = 0; z < pwParts.length; z++) {
                    var ssLocation = pwParts[z].indexOf(foundMatch);
                    if (ssLocation > -1) { // remove; leave remainder of string
                        pwParts.splice(z, 1, pwParts[z].substring(0, ssLocation), pwParts[z].substring(ssLocation + foundMatch.length));
                        pwParts = pwParts.filter(function (e) {
                            return e
                        });
                        // that cleared out empty strings etc
                        break;
                    }
                }
                var listofSS = pwParts.listSubstringsMinMax(4, foundMatch.length);
                foundMatch = "";
                i = 0;
            } else {
                i++;
            }
        }

        // generate list of word choices to complain to the user about
        var publicComplaints = new Array<string>();
        var sensitiveComplaints = new Array<string>();
        var complaintLength = 0; // keep track of how many characters were in a wordlist
        var complaintTokens = 0; // keep track of how many separate tokens (words) were used

        var boldList = function (foo: Array<string>): string {
            return Helper.Helper.boldAll(foo.removeDuplicates()).toHumanString();
        };

        var fillComplaints = function (array: Array<string>, text: string): void {
            if (array.length > 0) {
                publicComplaints.push(text);
                for (var i = 0; i < array.length; i++) {
                    complaintLength += array[i].length;
                    complaintTokens++;
                }
                sensitiveComplaints.push(text + " (" + boldList(array) + ")");
                //sensitiveComplaints.push("names (<b>" + nameArray.removeDuplicates().join(" </b>and<b> ") + "</b>)");
            }
        }

        fillComplaints(nameArray, "names");
        fillComplaints(petnameArray, "pet names");
        fillComplaints(phraseArray, "common phrases");
        fillComplaints(englishwordArray, "dictionary words");
        fillComplaints(wikipediaArray, "words used on Wikipedia");
        fillComplaints(transformationArray, "simple transformations of words or phrases");

        if (publicComplaints.length > 0) {
            reasonWhy = "Attackers use software that automatically guesses millions of words commonly found in dictionaries, wordlists, or other people's passwords";
            publicText = "Don't use ";
            sensitiveText = "Don't use ";
            if (commonness < 100) { // they used a common transformation
                reasonWhy += ", including simple transformations of those words/phrases where they substitute digits and symbols for letters";
            }
            publicText += publicComplaints.join(" or ");
            sensitiveText += sensitiveComplaints.join(" or ");
        }

        // adjust the commonness to make the uncommon substitutions higher numbers
        // as a result of this transformation, no substitutions will be commonness 0
        // and a substitution that occurs 2% of the time will be 98
        commonness = 100 - commonness;

        return {
            length: complaintLength,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText,
            dictionaryTokens: complaintTokens,
            substitutionCommonness: commonness
        };
    }

    interface DatesComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function identifyDates(pw: string): DatesComment {
        /* this function should return the number of characters that appear to be part of a date
        see https://www.researchgate.net/profile/Christopher_Collins5/publication/235945835_Visualizing_semantics_in_passwords_the_role_of_dates/links/00b7d52956af68fd0c000000.pdf */
        var score = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";
        var datesUsed: Array<string> = [];

        var helper = PasswordMeter.PasswordMeter.instance.getHelper();

        var passwordParts = [pw]; // as we start removing things, keep an array of the remaining parts

        var dateanalyze = function (rx: RegExp): void {
            var resultObj = helper.matchHelper(passwordParts, rx);
            if (resultObj.score > 0) {
                score += resultObj.score;
                datesUsed = datesUsed.concat(resultObj.matched.toString());
                passwordParts = resultObj.revisedParts;
            }
        };

        // date delimiters
        const DEL = '([ .-/])';
        // potentialTODO if we don't want to accept a single digit month, discard
        // what is after the last OR. MMDDYYYY matched on 2012020 because of this
        // though the actual date string was 20120202 (YYYYMMDD)
        const MM = '((0\\d|1[012])|\\d)';
        const MMMM = '(january|february|march|april|may|june|july|august|september|october|november|december)';
        const DD = '([012]\\d|3[01])';
        const YY = '(\\d\\d)';
        const YYYY = '(19\\d\\d|20[01234]\\d)';

        // identify dates YYYY-MM-DD with delimiters?
        // identify dates YYYYMMDD without delimiters?

        // identify dates MM-DD-YYYY with delimiters
        var rx = new RegExp(MM + DEL + DD + DEL + YYYY, "g");
        dateanalyze(rx);

        // identify dates DD-MM-YYYY with delimiters
        var rx = new RegExp(DD + DEL + MM + DEL + YYYY, "g");
        dateanalyze(rx);

        // identify dates MM-DD-YY with delimiters
        var rx = new RegExp(MM + DEL + DD + DEL + YY, "g");
        dateanalyze(rx);

        // identify dates DD-MM-YY with delimiters
        var rx = new RegExp(DD + DEL + MM + DEL + YY, "g");
        dateanalyze(rx);

        // identify dates MMDDYYYY without delimiters
        var rx = new RegExp(MM + DD + YYYY, "g");
        dateanalyze(rx);

        // identify dates DDMMYYYY without delimiters
        var rx = new RegExp(DD + MM + YYYY, "g");
        dateanalyze(rx);

        // in the future, maybe consider identifying dates MMDDYY without any delimiters, but there seem to be lots of false positives

        // identify spelled-out months and recent year (4 digits)
        var rx = new RegExp(MMMM + YYYY, "ig");
        dateanalyze(rx);

        // identify spelled-out months and recent year (2 digits)
        var rx = new RegExp(MMMM + YY, "ig");
        dateanalyze(rx);

        // identify dates MM-DD with delimiters/
        var rx = new RegExp(MM + DEL + DD, "g");
        dateanalyze(rx);

        // identify dates DD-MM with delimiters/
        var rx = new RegExp(DD + DEL + MM, "g");
        dateanalyze(rx);

        // identify recent years between 1900 and 2049
        var rx = new RegExp(YYYY, "g");
        dateanalyze(rx);

        if (score > 0) {
            publicText = "Avoid using dates";
            sensitiveText = "Avoid using dates like " + Helper.Helper.boldAll(datesUsed).toHumanString();
            reasonWhy = "Dates and years in any format are quite common in passwords";
            problemText = datesUsed[0].escapeHTML(); // zzz this should be an array
        }

        return {
            count: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface AlphaSequenceComment {
        count: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
        problemText: string;
    }
    export function alphabeticSequenceCheck(pw: string): AlphaSequenceComment {
        /* return the number of characters the are part of 3+ character sequences
           (e.g., abc), defined using the ASCII code for those characters. if there
           are multiple such sequences, return the sum of the number of characters
           in each. */

        var score = 0;
        var publicText = "";
        var sensitiveText = "";
        var problemText = "";
        var reasonWhy = "";

        var charCodeVector: Array<number> = []; // stores the charcode at position i
        var differenceVector: Array<number> = []; // stores the difference in character codes between subsequent characters

        charCodeVector[0] = pw.charCodeAt(0);
        for (var i = 1; i < pw.length; i++) {
            charCodeVector[i] = pw.charCodeAt(i);
            differenceVector[i - 1] = charCodeVector[i] - charCodeVector[i - 1];
        }

        var longestmatchstart = -1;
        var longestmatchlength = -1;
        var currentstart = 0;
        var currentSeqEnd = 0;
        var currentSequence = -1;

        for (var i = 0; i < differenceVector.length; i++) {
            // potentialTODO we have the inter-character vectors in differenceVector now
            var vector = differenceVector[i];
            if (vector === currentSequence) {
                // continuing the series
            } else {
                // a new vector, save the data of the old series if necessary
                if (i - currentstart > longestmatchlength) {
                    // longer than what we've seen so far, so save info

                    // original wanted to ignore char repeats?
                    if (vector !== 0) {
                        longestmatchstart = currentstart;
                        longestmatchlength = i - currentstart;
                    }
                }
                // now start a new series
                currentstart = i;
            }
            /*
                for (var i = 1; i < differenceVector.length; i++) {
                    if (differenceVector[i] === currentSeqDifference) { // if same, extend the current sequence
                        currentSeqEnd = i;
                    } else { // that was the end of the current sequence
                        if ((currentSeqEnd - currentSeqStart) > (longestSeqEnd - longestSeqStart) &&
                        currentSeqDifference !== 0) {
                            // if longer than previous longest and also not just a repeated sequence
                            longestSeqStart = currentSeqStart;
                            longestSeqEnd = currentSeqEnd;
                        }
                        currentSeqStart = i;
                        currentSeqEnd = i;
                        currentSeqDifference = differenceVector[i];
                    }
                }
                if ((currentSeqEnd - currentSeqStart) > (longestSeqEnd - longestSeqStart) && currentSeqDifference !== 0) { // if last one longer than previous longest and also not just a repeated sequence
                    longestSeqStart = currentSeqStart;
                    longestSeqEnd = currentSeqEnd;
                }
 
                var score = longestSeqEnd - longestSeqStart + 1;
                */
            var score = longestmatchlength;
            if (score === 1) { // no repeated difference vectors, so give it a score of 0
                score = 0;
            }
            if (score >= 2) { // at least one repeated difference vector
                score++;
            }
            if (score >= 4) { // only show text if at least 4 characters
                var myProblem = pw.substr(longestmatchstart, longestmatchstart + longestmatchlength + 1);
                problemText = myProblem.escapeHTML();
                var ALLDIGITS = new RegExp("^[0-9]+$");
                if (myProblem.match(ALLDIGITS)) {
                    publicText = "Avoid numerical patterns";
                    sensitiveText = "Avoid numerical patterns like <b>" + problemText + "</b>";
                } else {
                    publicText = "Avoid patterns from the alphabet";
                    sensitiveText = "Avoid patterns from the alphabet like <b>" + problemText + "</b>";
                }
                reasonWhy = "Attackers know to guess sequences following the alphabet, in addition to repeated characters or patterns on your keyboard";
            }
        }

        return {
            count: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText,
            problemText: problemText
        }
    }

    interface StructureComment {
        score: number;
        reasonWhy: string;
        publicText: string;
        sensitiveText: string;
    }
    export function structurePredictable(pw: string): StructureComment {
        /* return value 1 (nth most common) - numStructures (1st most common) if the
        password has one of the numStructures most common character-class structures,
        and 0 else */

        var numStructures = 2124;
        var publicText = "";
        var sensitiveText = "";
        var reasonWhy = "";
        var score = 0;
        var pw = pw.replace(/[A-Z]/g, "U"); // replace uppercase letters with U (do this first since U is uppercase!)
        var pw = pw.replace(/[a-z]/g, "L"); // replace lowercase letters with L
        var pw = pw.replace(/[0-9]/g, "D"); // replace digits with D
        var pw = pw.replace(/[^A-Za-z0-9]/g, "S"); // replace everything else with S
        var whereInArray = Constants.Constants.commonStructures.indexOf(pw);
        if (whereInArray >= 0) {
            score = numStructures - whereInArray;
            reasonWhy = "One technique attackers use is to try all possible passwords within common structures, or arrangements of character classes (e.g., where lowercase letters and digits are located)";
            publicText = "The way you structure your password is predictable";
            sensitiveText = publicText + " (";
            // convert the structure shorthand to something intelligible
            var theStructure = "";
            var firstone = true; // used to determine whether to precede text with a comma
            var j = 0;
            while (j < pw.length) {
                var k = 0;
                while (((j + k) < pw.length) && (pw.charAt(j) === pw.charAt(j + k))) {
                    k++;
                }
                if (!firstone) {
                    sensitiveText += ", ";
                }
                firstone = false;
                sensitiveText += (k).toString() + " ";
                if (pw.charAt(j) === "L") {
                    sensitiveText += "lowercase letter";
                } else if (pw.charAt(j) === "U") {
                    sensitiveText += "uppercase letter";
                } else if (pw.charAt(j) === "D") {
                    sensitiveText += "digit";
                } else if (pw.charAt(j) === "S") {
                    sensitiveText += "symbol";
                }
                if (k > 1) {
                    sensitiveText += "s";
                }
                j = j + k;
            }
            sensitiveText += ")";
        }
        return {
            score: score,
            reasonWhy: reasonWhy,
            publicText: publicText,
            sensitiveText: sensitiveText
        }
    }
}
