import PasswordMeter = require("./PasswordMeter");
import Constants = require("./constants");
import Config = require("./config");

declare class NeuralNetworkClient {
    constructor(cb: (n: number, s: string) => void, config: Config.Config.ConfigNeuralNetwork);
    query_guess_number(pw: string): void;
    predict_next(s: string): void;
    debug_prefix_prob(s: string): void;
    debug_password_prob(s: string): void;
    debug_password_guess_num(s: string): void;
    debug_next_char(s: string, verbose: boolean): void;
}

export module NeuralNetwork {
    // In case neural nets don't load, don't wait to give a score
    var neverHeardFromNN = true;

    // mapping of passwords to score based on neural networks
    var neuralNetMapping: { [key: string]: number } = {};

    // Helper function designed to post-process neural network guess numbers
    // to account for capitalization. 
    // It scales guess numbers by 1.5 if they capitalize the first character, 
    // by 2 if they capitalize all characters, by 10 if they use any other pattern,
    // and 1 if there are no uppercase characters.
    function uppercasePredictabilityPostProcessing(pw: string): number {
        // Start by assuming no uppercase at all
        var scalingFactor = 1;
        var allButFirstChar = pw.substr(1);
        // Check if first character is uppercase, and that no others are
        if ((pw.charAt(0) === pw.charAt(0).toUpperCase()
            && pw.charAt(0) !== pw.charAt(0).toLowerCase())
            && (allButFirstChar === allButFirstChar.toLowerCase())) {
            scalingFactor = 1.5;
            // Check if `all uppercase' (>=3 characters uppercase and no lowercase letters)
        } else if (pw.search(/[a-z]/) == -1) {
            // First delete all uppercase characters
            var pwNoUppercase = pw.replace(Constants.Constants.UPPERCASE_LETTERS_GLOBAL, "");
            // Check if password is now 3+ characters shorter
            if (pw.length >= (pwNoUppercase.length + 3)) {
                scalingFactor = 2;
            }
            // Check if there are uppercase characters that don't fit into those two patterns
        } else if (pw !== pw.toLowerCase()) {
            scalingFactor = 10;
        }
        return scalingFactor;
    }

    // Math.log10 is not universal yet
    export function log10(x: number): number {
        return Math.log(x) / Math.LN10;
    }

    // 1. if NN num is a finite number but negative or 0, map to log10(1.1) ~= 0.04
    // 2. as long as password is not empty string (""), if NN is +infinity, then map to 100 percent
    //    (due to NN bug, empty string maps to positive +infinity also; don't map to 100 for that case)
    // 3. if NN is not a number
    function postProcessNnNumAndCache(result: number, password: string): void {
        result = result * uppercasePredictabilityPostProcessing(password);
        neverHeardFromNN = false;
        var value = log10(result);

        // With estimates, we can get fractional/negative guess numbers
        // for terrible passwords, so compensate to have a very small number
        if (result <= 1) {
            value = log10(1.1);
        }
        // Neural nets give infinity for empty passwords, hence check length
        if (password.length > 0 && result == Number.POSITIVE_INFINITY) {
            value = 100;
        }
        // if result is undefined for some reason, just store -1
        // as NN, so meter will ignore that passwords NN number
        if (isNaN(result)) {
            value = -1;
        }

        var nni = PasswordMeter.PasswordMeter.instance.getNN();
        nni.setNeuralNetNum(password, value);
    }

    // The main callback function for the neural network evaluation.
    // When it returns, it will display the rating (update the UI).
    function nnCallback(result: number, password: string): void {
        postProcessNnNumAndCache(result, password);
        var UI = PasswordMeter.PasswordMeter.instance.getUI();
        UI.displayRating(password);
    }

    // This alternate callback function is used instead when evaluating 
    // concrete suggestions for a better password
    export function nnFixedCallback(result: number, password: string): void {
        postProcessNnNumAndCache(result, password);
        var UI = PasswordMeter.PasswordMeter.instance.getUI();
        UI.synthesizeFixed(password);
    }

    export class NeuralNetworkInterface {
        nn: NeuralNetworkClient;
        nnfixed: NeuralNetworkClient;

        constructor(nn: NeuralNetworkClient, nnfixed: NeuralNetworkClient) {
            this.nn = nn;
            this.nnfixed = nnfixed;
        }

        public heardFromNn(): boolean {
            return !neverHeardFromNN;
        }

        // set the mapping from the neural network
        public setNeuralNetNum(pw: string, value: number): void {
            neuralNetMapping[pw] = value;
        }

        // set the mapping from the neural network
        public getNeuralNetNum(pw: string): number {
            return neuralNetMapping[pw];
        }

        // initiate NN guess number lookup
        public queryGuessNumber(pw: string, isConcreteSuggestionCandidate: boolean): void {
            if (isConcreteSuggestionCandidate) {
                this.nnfixed.query_guess_number(pw);
            } else {
                this.nn.query_guess_number(pw);
            }
        }

        public debugNN(pw: string, verbose: boolean) {
            this.nn.debug_prefix_prob(pw);
            this.nn.debug_password_prob(pw);
            this.nn.debug_next_char(pw, verbose);
        }
    }

    (function() {
        var registry = PasswordMeter.PasswordMeter.instance;
        var config = registry.getConfig();

        var neuralNetworkConfig = config.neuralNetworkConfig;
        var nnFixed = new NeuralNetworkClient(nnFixedCallback, neuralNetworkConfig);
        var nn = new NeuralNetworkClient(nnCallback, neuralNetworkConfig);
        var instance = new NeuralNetworkInterface(nn, nnFixed);
        registry.setNN(instance);

        // initial NN debug message
        instance.debugNN("", false);
        console.log("To view all next char probabilities, use: PasswordMeter.debugNN()");
    }())
}
