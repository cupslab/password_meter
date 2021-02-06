(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

var verboseMode = false;

function NeuralNetworkClient(callback, configuration) {
    if (!NeuralNetworkWorker.configured) {
        NeuralNetworkWorker.worker.postMessage({
            messageType: "config",
            payload: configuration
        });
        NeuralNetworkWorker.configured = true;
    }
    this.callback = callback;
    // random string id
    this.id = (Math.random() * 1e32).toString(36);
    // register this instance
    NeuralNetworkWorker.clients[this.id] = this;
}

// declare shared state for neural network clients
var NeuralNetworkWorker = new Object();
// map of client ids to instances
NeuralNetworkWorker.clients = new Object();
// shared worker
NeuralNetworkWorker.worker = new Worker('worker.min.js');
// configuration flag
NeuralNetworkWorker.configured = false;

NeuralNetworkWorker.onMessageTriggered = function (event) {
    var clientTag = event.data.clientTag;
    var client = NeuralNetworkWorker.clients[clientTag];
    var debug = event.data.debug;
    if (typeof client !== "undefined") {
        if (!debug) {
            // whatever callback function is passed to NeuralNetworkWorker during
            // initialization will be called with two parameters:
            // event.data.prediction and event.data.password
            //
            // if onMessageTriggered is triggered as a results of
            // NeuralNetworkClient.query_guess_number, then
            //   event.data.prediction: the guess number for event.data.password
            //   event.data.password: the password being predicted
            client.callback(event.data.prediction, event.data.password);
        } else {
            if (verboseMode) {

                var password = event.data.password == "" ? "<empty string>" : event.data.password;

                switch (event.data.action) {

                    case "total_prob":
                        var isCompletePassword = event.data.isCompletePassword;
                        if (isCompletePassword) {
                            console.log("P(" + password + "<end>) = " + event.data.prediction.toPrecision(4));
                        } else {
                            console.log("P(" + password + ") = " + event.data.prediction.toPrecision(4));
                        }
                        break;

                    case "guess_number":
                        var logGuessNum;
                        if (event.data.prediction <= 0) {
                            logGuessNum = -1;
                        } else {
                            logGuessNum = Math.log10(event.data.prediction).toFixed(2);
                        }

                        console.log(password + " [scaled NN #: " + logGuessNum + "]");
                        break;

                    case "predict_next":
                        var charProbs = event.data.prediction;

                        // replace '\n' with what it maps to semantically
                        Object.defineProperty(charProbs, "<end>", Object.getOwnPropertyDescriptor(charProbs, "\n"));
                        delete charProbs["\n"];

                        var mostLikely = Object.keys(charProbs).reduce(function (a, b) {
                            return charProbs[a] > charProbs[b] ? a : b;
                        });
                        var mostLikelyProb = charProbs[mostLikely];

                        if (!event.data.verbose) {

                            var secondMostLikely;
                            var thirdMostLikely;
                            var secondMostLikelyProb = -Infinity;
                            var thirdMostLikelyProb = -Infinity;

                            for (var pChar in charProbs) {
                                if (charProbs[pChar] <= mostLikelyProb && pChar != mostLikely && charProbs[pChar] > secondMostLikelyProb) {
                                    thirdMostLikely = secondMostLikely;
                                    thirdMostLikelyProb = secondMostLikelyProb;
                                    secondMostLikely = pChar;
                                    secondMostLikelyProb = charProbs[pChar];
                                } else if (charProbs[pChar] <= secondMostLikelyProb && pChar != secondMostLikely && charProbs[pChar] > thirdMostLikelyProb) {
                                    thirdMostLikely = pChar;
                                    thirdMostLikelyProb = charProbs[pChar];
                                }
                            }

                            console.log(password + " [most probable next chars]");
                            console.log("\t1. " + mostLikely + " [prob: " + mostLikelyProb.toPrecision(4) + "]");
                            console.log("\t2. " + secondMostLikely + " [prob: " + secondMostLikelyProb.toPrecision(4) + "]");
                            console.log("\t3. " + thirdMostLikely + " [prob: " + thirdMostLikelyProb.toPrecision(4) + "]");
                        } else {
                            console.log(password + " [next character probabilities]");

                            for (var pChar in charProbs) {

                                if (pChar == mostLikely) {
                                    console.log("\t" + pChar + ": " + charProbs[pChar].toPrecision(4) + " [most probable]");
                                } else {
                                    console.log("\t" + pChar + ": " + charProbs[pChar].toPrecision(4));
                                }
                            }
                        }

                        break;
                }
            }
        }
    }
};

NeuralNetworkWorker.worker.onmessage = NeuralNetworkWorker.onMessageTriggered;

// in all client methods below, pwd can be shorter than the min length
// or longer than the context length.
// each the following sends a message to the worker via postMessage()

NeuralNetworkClient.prototype.query = function (password, isIncompletePassword) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'total_prob',
        isIncompletePassword: isIncompletePassword,
        debug: false
    });
};

NeuralNetworkClient.prototype.predict_next = function (password) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'predict_next',
        verbose: true,
        debug: false
    });
};

NeuralNetworkClient.prototype.query_guess_number = function (password) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'guess_number',
        debug: false
    });
};

// debug_* methods will print out debug info to the console

NeuralNetworkClient.prototype.debug_prefix_prob = function (password) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'total_prob',
        isIncompletePassword: true,
        debug: true
    });
};

NeuralNetworkClient.prototype.debug_password_prob = function (password) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'total_prob',
        isIncompletePassword: false,
        debug: true
    });
};

NeuralNetworkClient.prototype.debug_password_guess_num = function (password) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'guess_number',
        isIncompletePassword: false,
        debug: true
    });
};

NeuralNetworkClient.prototype.debug_next_char = function (password, verbose) {
    NeuralNetworkWorker.worker.postMessage({
        clientTag: this.id,
        password: password,
        action: 'predict_next',
        verbose: verbose,
        debug: true
    });
};

global.NeuralNetworkClient = NeuralNetworkClient;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
