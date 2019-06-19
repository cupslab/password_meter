// Copyright 2017 by Carnegie Mellon University
// globals on entry:
// $ for JQuery (infected with Bootstrap)
// LZString for LZString
// optional passwordMeterConfig for configuration

import JQuery = require("jquery");
import LZString = require("lz-string");
import Helper = require("./helper");
import Config = require("./config");
import Dictionaries = require("./dict-misc");
import UIMisc = require("./ui-misc");
import NeuralNetwork = require("./nn-misc");

export module PasswordMeter {
    class Registry {
        private data: { [key: string]: any } = {};

        setConfig(config: Config.Config.Config): void {
            this.data["config"] = config;
        }

        getConfig(): Config.Config.Config {
            return this.data["config"];
        }

        setJquery(jquery: JQueryStatic): void {
            this.data["jquery"] = jquery;
        }

        getJquery(): JQueryStatic {
            return this.data["jquery"];
        }

        setLzstring(lzstring: LZString.LZStringStatic): void {
            this.data["lzstring"] = lzstring;
        }

        getLzstring(): LZString.LZStringStatic {
            return this.data["lzstring"];
        }

        setHelper(helper: Helper.Helper.Helper): void {
            this.data["helper"] = helper;
        }

        getHelper(): Helper.Helper.Helper {
            return this.data["helper"];
        }

        setDictionaries(dictionaries: Dictionaries.Dictionaries.Dictionaries) {
            this.data["dictionaries"] = dictionaries;
        }

        getDictionaries(): Dictionaries.Dictionaries.Dictionaries {
            return this.data["dictionaries"];
        }

        setUI(ui: UIMisc.UIMisc.UIMisc) {
            this.data["ui"] = ui;
        }

        getUI(): UIMisc.UIMisc.UIMisc {
            return this.data["ui"];
        }

        setNN(nn: NeuralNetwork.NeuralNetwork.NeuralNetworkInterface) {
            this.data["nn"] = nn;
        }

        getNN(): NeuralNetwork.NeuralNetwork.NeuralNetworkInterface {
            return this.data["nn"];
        }

        debugNN(summaryOnly: boolean): void {
            var currentPwd = this.getJquery()("#pwbox").val() as string;
            this.data["nn"].debugNN(currentPwd, !summaryOnly);
        }

        /* bootstrap apparently infects jquery
            setBootstrap(bootstrap:Bootstrap):void {
                this.data["bootstrap"] = bootstrap;
            }
        
            getBootstrap():Bootstrap {
                return this.data["bootstrap"];
            }
        */
    }

    export var instance = new Registry();
    instance.setJquery($);
    declare var LZString: LZString.LZStringStatic;
    instance.setLzstring(LZString);
    var helper = new Helper.Helper.Helper($, LZString, true);
    instance.setHelper(helper);

    declare var passwordMeterConfig: Config.Config.Config;
    var config = (typeof passwordMeterConfig === "undefined") ?
        Config.Config.passwordMeterDefaultConfig :
        passwordMeterConfig;
    instance.setConfig(config);

    declare var window: any;
    if (typeof window !== "undefined") {
        window.PasswordMeter = PasswordMeter.instance;
    }
}
