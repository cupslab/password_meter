// 1c12, minNN=10^10, prohibit known leaked passwords
var passwordMeterConfig = {
    provideConcretePasswordSuggestions: false,
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
    domainSpecificWords: ["pittsburgh", "steelers", "stillers", "penguins", "pens", "pirates", "bucs", "carnegie", "mellon", "university"],
    length: {
        active: true,
        minLength: 12,
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
        active: true,
        list: [],
    },
    repeatChars: { // prohibit a character being repeated N or more times consecutively
        active: false,
        limit: 3, 
    },
    usernameDifference: { // prohibit passwords being N or fewer characters different than username
        active: true,
        limit: 1, 
    }, 
    minLogNnGuessNum: { // prohibit passwords with NN guess num less than 10^threshold
        active: true,
        threshold: 10, 
        rejectionFeedback: "Not be similar to common passwords",
    },
    sameChars: { // prohibit a character being repeated N or more times (incl. non-consecutively)
        active: false,
        limit: 3, 
        lengthException: 20,
    },
    prohibitKnownLeaked: { // prohibit passwords found in database leaks, as reported by Pwned Pwds
        active: true,
        smallestLength: 5,
    },
    blacklist: {
        active: false,
        blacklistFile: "blacklist-chi17lowercase-compressed.txt", // all letters are lowercase
        caseSensitive: false,
        stripDigitsSymbolsFromPassword: false,
        checkSubstrings: false,
        checkSubstringLength: 5,
        lengthException: -1, // set to -1 if there is no length exception
    },
    neuralNetworkConfig: {
        modelName: "1c8",
        modelPathPrefix: "tfjs_1c8",
        guessNumScaleFactor: 300,
        cacheSize: 1000,
        passwordEndChar: "\n",
	postProcessUppercasePredictability: false,
	policyMinLength: 12,
	policyMinCharClasses: 1
    },
    staticUrlPrefix: "", // use if need need to prepend a path to the worker.min.js path
    barFillStringencyScaleFactor: 67 / 12, // 2/3 (~67%) of meter should represent 10^12

    // point at which NN password-strength estimates directly drive
    // the strength bar, in terms of NN-based strength score (before
    // this point, a length-based heuristic is used). The NN-based
    // strength score is the product of the the scaled log10 guess
    // number estimate and the 'barFillStringencyScaleFactor'
    // configuration value
    minNnScoreToInfluenceBar: 15 
};
