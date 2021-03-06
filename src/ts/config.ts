// test 11 dimensions of composition requirements as follows:
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
//   dimension 11: previously leaked passwords

import PasswordMeter = require("./PasswordMeter");

export module Config {
    interface ConfigColor {
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

    interface ConfigSmallestLength {
        active: boolean;
        smallestLength: number;
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

    interface ConfigBlacklist {
        active: boolean;
        // if case-insensitive, blacklist file should contain all lowercase entries
        // if stripsDigitsSymbol, blacklist file should contain all letters
        blacklistFile: string;
        caseSensitive: boolean;
        stripDigitsSymbolsFromPassword: boolean;
        checkSubstrings: boolean;
        checkSubstringLength: number; // (minimum) substring length of blacklisted-item that password should be checked against
        lengthException: number; // -1 if no length exception
    }

    export interface ConfigNeuralNetwork { // raise visibility because we pass it on to a dependency
        modelName: string;
        modelPathPrefix: string;
        guessNumScaleFactor: number;
        cacheSize: number;
        passwordEndChar: string;
        postProcessUppercasePredictability: boolean;
        // the following are only used in the NeoCortex-based JavaScript NN (not in TensorflowJS)
        intermediate: string;
        file: string;
        zigzag: boolean;
    }

    export interface Config {
        provideConcretePasswordSuggestions: boolean;
        randomizeOrderCharClassRequirement: boolean;
        colors: ConfigColor;
        symbols: ConfigSymbols;
        remindAgainstReuse: boolean;
        domainSpecificWords: Array<string>; // list of words that should count for nothing in the password
        length: ConfigLength;
        classCount: ConfigClassCount;
        classRequire: ConfigClassBoolean;
        classAllow: ConfigClassBoolean;
        forbidChars: ConfigForbidChars;
        repeatChars: ConfigLimit;
        sameChars: ConfigLimitLengthException;
        usernameDifference: ConfigLimit;
        minLogNnGuessNum: ConfigThreshold;
        prohibitKnownLeaked: ConfigSmallestLength;
        blacklist: ConfigBlacklist;
        neuralNetworkConfig: ConfigNeuralNetwork;
        staticUrlPrefix: string;
        barFillStringencyScaleFactor: number;
        minNnScoreToInfluenceBar: number;
    }

    export var passwordMeterDefaultConfig: Config = {
        provideConcretePasswordSuggestions: true,
        randomizeOrderCharClassRequirement: true,
        colors: { // display colors
            compliant: "#006600", // by default show completed requirement in green
            noncompliant: "#660000", // by default show outstanding requirement in red
        },
        symbols: { // display symbols
            compliant: "&#x2714; ", // HEAVY CHECK MARK
            noncompliant: "&#x2751; ", // LOWER RIGHT SHADOWED WHITE SQUARE
        },
        remindAgainstReuse: true, // true to emphasize *not* reusing passwords
        domainSpecificWords: // list of words that should count for nothing in the password
            ["mechanical", "amazon", "mturk", "turk", "survey", "bonus", "qualtrics",
                "study", "carnegie", "mellon", "university"],
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
        forbidChars: {
            active: false,
            list: [],
        },
        repeatChars: {
            active: false,
            limit: 3, // prohibit a character being repeated N or more times consecutively
        },
        sameChars: { // multiple occurrences but nonconsecutive
            active: false,
            limit: 3, // prohibit a character being used N or more times (incl. non-consecutively)
            lengthException: 20, // constraint does not apply if password is longer than 20 chars
        },
        usernameDifference: {
            active: false,
            limit: 1, // prohibit passwords being N or fewer characters different than username
        },
        minLogNnGuessNum: {
            active: false,
            threshold: 7, // prohibit passwords with a NN guess number less than 10^7
            rejectionFeedback: "Not be similar to extremely common passwords",
        },
        prohibitKnownLeaked: {
            active: false,
            smallestLength: 5,
        },
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
            modelName: "1c8",
            modelPathPrefix: "tfjs_1c8",
            guessNumScaleFactor: 300,
            cacheSize: 1000,
            passwordEndChar: "\n",
            postProcessUppercasePredictability: false,
            // for PGS++ NN models
            intermediate: "",
            file: "",
            zigzag: false,
        },
        staticUrlPrefix: "",
        barFillStringencyScaleFactor: 67 / 12, // 2/3 (~67%) of meter should represent 10^12
        minNnScoreToInfluenceBar: 15,
    };

}
