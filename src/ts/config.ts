// test 10 dimensions of composition requirements as follows:
//   dimension 1: length (min / max)
//   dimension 2: mandatory # of character classes
//   dimension 3: mandatory character classes
//   dimension 4: forbidden character classes
//   dimension 5: forbidden passwords
//   dimension 6: permitted/forbidden characters
//   dimension 7: repeated consecutive characters
//   dimension 8: password - username comparison
//   dimension 9: NN complexity
//   dimension 10: repeated nonconsecutive characters

import PasswordMeter = require("./PasswordMeter");

export module Config {
interface ConfigColor{
    compliant: string;
    noncompliant: string;
}

interface ConfigSymbols {
    compliant: string;
    noncompliant: string;
}

interface ConfigLength {
    active: boolean;
    minLength: number;
    maxLength: number;
}

interface ConfigClassCount {
    active: boolean;
    minCount: number;
    maxCount: number;
}

interface ConfigClassBoolean {
    active: boolean;
    upperCase: boolean;
    lowerCase: boolean;
    digits: boolean;
    symbols: boolean;
}

//interface ConfigForbidPasswords {
//    active: boolean;
//    includeLargerList: boolean;
//}

interface ConfigForbidChars {
    active: boolean;
    list: Array<string>;
}

interface ConfigLimit {
    active: boolean;
    limit: number;
}

interface ConfigLimitLengthException {
    active: boolean;
    limit: number;
    lengthException: number;
}

interface ConfigThreshold {
    active: boolean;
    threshold: number;
    rejectionFeedback: string;
}

interface ConfigBlacklist { // josh: probably should export this since pass on to dependency
    active: boolean;
    // if case-insensitive, blacklist file should contain all lowercase entries
    // if stripsDigitsSymbol, blacklist file should contain all letters
    blacklistFile: string;
    caseSensitive: boolean;
    stripDigitsSymbolsFromPassword: boolean;
    checkSubstrings: boolean;
    checkSubstringLength: number; // (minimum) substring length of blacklisted-item that password should be checked against
    lengthException: number;
}

export interface ConfigNeuralNetwork { // raise visibility because we pass it on to a dependency
    intermediate: string;
    file: string;
    zigzag: boolean;
    scaleFactor: number;
}

export interface Config {
    colors: ConfigColor;
    symbols: ConfigSymbols;
    remindAgainstReuse: boolean;
    ignoredWords: Array<string>; // list of words that should count for nothing in the password
    //forbiddenPasswords: Array<string>; // list of passwords that should be rejected
    length: ConfigLength;
    classCount: ConfigClassCount;
    classRequire: ConfigClassBoolean;
    classAllow: ConfigClassBoolean;
    //forbidPasswords: ConfigForbidPasswords;
    forbidChars: ConfigForbidChars;
    repeatChars: ConfigLimit;
    sameChars: ConfigLimitLengthException;
    usernameDifference: ConfigLimit;
    minLogNnGuessNum: ConfigThreshold;
    prohibitKnownLeaked: boolean;
    blacklist: ConfigBlacklist;
    neuralNetworkConfig: ConfigNeuralNetwork;
}

export var passwordMeterDefaultConfig: Config = {
    colors: { // display colors
        compliant: "#006600", // by default show completed requirement in green
        noncompliant: "#660000", // by default show outstanding requirement in red
    },
    symbols: { // display symbols
        compliant: "&#x2714; ", // HEAVY CHECK MARK
        noncompliant: "&#x2751; ", // LOWER RIGHT SHADOWED WHITE SQUARE
    },
    remindAgainstReuse: true, // true to emphasize *not* reusing passwords
    ignoredWords: // list of words that should count for nothing in the password
        ["mechanical", "amazon", "mturk", "turk", "survey", "bonus", "qualtrics",
        "study", "carnegie", "mellon", "university"],
    /*
    forbiddenPasswords: // list of passwords that should be rejected
         ["123456", "password", "12345", "12345678", "qwerty", "1234567890", "1234",
         "baseball", "dragon", "football", "1234567", "monkey", "letmein", "abc123",
         "111111", "mustang", "access", "shadow", "master", "michael", "superman",
         "696969", "123123", "batman", "trustno1"],
    */
    length: {
        active: true,
        minLength: 8,
        maxLength: 0, // set to 0 if there is no maximum length
    },
    classCount: { // number of character classes
        active: false,
        minCount: 1, // classes are upper case, lower case, digits and symbols (others)
        maxCount: 4,
    },
    classRequire: { // required character classes
        active: false,
        upperCase: false,
        lowerCase: true,
        digits: true,
        symbols: false,
    },
    classAllow: { // permitted character classes
        active: false,
        upperCase: true,
        lowerCase: true,
        digits: true,
        symbols: true,
    },
    /*
    forbidPasswords: {
        active: true,
        includeLargerList: true, // setting this to true also blacklists tens of thousands
        // of common passwords loaded for the common passwords dictionary check
    },
    */
    forbidChars: {
        active: false,
        list: [],
    },
    repeatChars: {
        active: true,
        limit: 3, // prohibit a character being repeated N or more times consecutively
    },
    sameChars: { // multiple occurrences but nonconsecutive
        active: false,
        limit: 3, // prohibit a character being used N or more times (incl. non-consecutively)
        lengthException: 20, // constraint does not apply if password is longer than 20 chars
    },
    usernameDifference: {
        active: true,
        limit: 1, // prohibit passwords being N or fewer characters different than username
    },
    minLogNnGuessNum: {
        active: false,
        threshold: 7, // prohibit passwords with a NN guess number less than 10^7
        rejectionFeedback: "Not be similar to extremely common passwords",
    },
    prohibitKnownLeaked: false,
        blacklist: {
            active: false,
            blacklistFile: "blacklist-cmu-compressed.txt",
            caseSensitive: false,
            stripDigitsSymbolsFromPassword: false,
            checkSubstrings: false,
            checkSubstringLength: 4,
            lengthException: 20,
        },
    neuralNetworkConfig: {
        intermediate: "basic_3M.info_and_guess_numbers.no_bloomfilter.json",
        file: "basic_3M.weight_arch.quantized.fixed_point1000.zigzag.nospace.json",
        zigzag: true,
        scaleFactor: 300,
    },

};

}
