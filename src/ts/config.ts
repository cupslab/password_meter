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
        intermediate: string;
        file: string;
        zigzag: boolean;
        scaleFactor: number;
    }

    export interface Config {
        provideConcretePasswordSuggestions: boolean;
        randomizeOrderCharClassRequirement: boolean;
        colors: ConfigColor;
        symbols: ConfigSymbols;
        remindAgainstReuse: boolean;
        ignoredWords: Array<string>; // list of words that should count for nothing in the password
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
        ignoredWords: ["mechanical", "amazon", "mturk", "turk", "survey", "bonus", "qualtrics", "study", "carnegie", "mellon", "university"],
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
        sameChars: {
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
            checkSubstringLength: 5,
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
