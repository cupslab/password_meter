import PasswordMeter = require("./PasswordMeter");
import Constants = require("./constants");
import Config = require("./config");

declare class NeuralNetworkClient {
	constructor(cb: (n: number, s: string) => void, config: Config.Config.ConfigNeuralNetwork);
	query_guess_number(pw: string): void;
}

export module NeuralNetwork {
	var verboseMode = false;
	// In case neural nets don't load, don't wait to give a score
	var neverHeardFromNN = true;

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
	function log10(x: number): number {
		return Math.log(x) / Math.LN10;
	}

	// The main callback function for the neural network evaluation.
	// When it returns, it will display the rating (update the UI).
	function nnCallback(result: number, password: string): void {
		// Make 10^15 guesses fill 2/3rds of meter
		const scaleToMeter = 67 / 15;

		var instance = PasswordMeter.PasswordMeter.instance;
		var UI = instance.getUI();
		var log = instance.getLog();

		result = result * uppercasePredictabilityPostProcessing(password);
		log.info(password + " is NN guess # " + result);

		neverHeardFromNN = false;
		var value = log10(result) * scaleToMeter;
		// With estimates, we can get fractional/negative guess numbers
		// for terrible passwords, so compensate to have a very small number
		if (result <= 1) {
			value = log10(1.1) * scaleToMeter;
		}
		if (isNaN(result)) {
			value = -1;
		}
		// Neural nets give infinity for empty passwords, hence check length
		if (password.length > 0 && result == Number.POSITIVE_INFINITY) {
			value = 100;
		}
		UI.setNeuralnetMapping(password, value);
		UI.displayRating(password);
	}

	// potentialTODO except for the logging, this looks exactly the same as above
	// This alternate callback function is used instead when evaluating 
	// concrete suggestions for a better password
	export function nnFixedCallback(result: number, password: string): void {
		// Make 10^15 guesses fill 2/3rds of meter
		const scaleToMeter = 67 / 15;

		var instance = PasswordMeter.PasswordMeter.instance;
		var UI = instance.getUI();
		var log = instance.getLog();

		result = result * uppercasePredictabilityPostProcessing(password);
		log.info("Fixed possibility " + password + " is NN guess # " + result);

		neverHeardFromNN = false;
		var value = log10(result) * scaleToMeter;

		// With estimates, we can get fractional/negative guess numbers
		// for terrible passwords, so compensate to have a very small number
		if (result <= 1) {
			value = log10(1.1) * scaleToMeter;
		}
		if (isNaN(result)) {
			value = -1;
		}
		// Neural nets give infinity for empty passwords, hence check length
		if (password.length > 0 && result == Number.POSITIVE_INFINITY) {
			value = 100;
		}
		UI.setNeuralnetMapping(password, value);
		UI.synthesizeFixed(password);
	}

	export class NeuralNetworkInterface {
		nnfixed: NeuralNetworkClient;
		nn: NeuralNetworkClient;

		constructor(nn: NeuralNetworkClient, nnfixed: NeuralNetworkClient) {
			this.nn = nn;
			this.nnfixed = nnfixed;
		}

		public heardFromNn(): boolean {
			return !neverHeardFromNN;
		}
	}

	(function () {
		var registry = PasswordMeter.PasswordMeter.instance;
		var jquery = registry.getJquery();
		var lzstring = registry.getLzstring();
		var config = registry.getConfig();

		var neuralNetworkConfig = config.neuralNetworkConfig;

		var nnFixed = new NeuralNetworkClient(nnFixedCallback, neuralNetworkConfig);
		var nn = new NeuralNetworkClient(nnCallback, neuralNetworkConfig);
		var instance = new NeuralNetworkInterface(nn, nnFixed);

		registry.setNN(instance);
	}())

}
