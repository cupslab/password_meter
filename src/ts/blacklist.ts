import PasswordMeter = require("./PasswordMeter");
import Helper = require("./helper");
import BloomFilter = require("../js/bloom-filter-js");
import Config = require("./config");
import PasswordLeaks = require("../js/hibp-js");

export module BlacklistModule {

    declare type BlacklistDictionaryType = { [key: string]: boolean };
    // @ts-ignore
    declare type BlacklistBloomType = BloomFilter.BloomFilter;
    // @ts-ignore
    declare type BlacklistLeakedType = PasswordLeaks.PasswordLeaks;

    export class Blacklists {

        blacklistDict: BlacklistDictionaryType;
        blacklistBloom: BlacklistBloomType;
        leaks: BlacklistLeakedType;

        blacklistRejects: (stringToCheck: string) => boolean;

        constructor(config: Config.Config.Config) {
            var helper: Helper.Helper.Helper = PasswordMeter.PasswordMeter.instance.getHelper();

            if (!config.blacklist.checkSubstrings) {
                this.blacklistRejects = function(stringToCheck) {
                    return this.blacklistDict[stringToCheck];
                }
            } else {
                this.blacklistRejects = function(stringToCheck) {
                    return this.blacklistBloom.substringExists(stringToCheck, config.blacklist.checkSubstringLength);
                }
            }

            // only load blacklist if the meter will use it
            if (config.blacklist.active) {
                if (config.blacklist.checkSubstrings) {
                    this.blacklistBloom = helper.compressedFileToBloomFilter(config.blacklist.blacklistFile,
                        config.blacklist.checkSubstringLength);
                } else {
                    this.blacklistDict = helper.compressedFileToDict(config.blacklist.blacklistFile);
                }
            }

            if (config.prohibitKnownLeaked.active) {
                this.leaks = new PasswordLeaks.PasswordLeaks()
            }
        }

        previouslyLeaked(pwd: string) {
            return this.leaks.previouslyLeaked(pwd);
        }
    }

    (function() {
        var registry = PasswordMeter.PasswordMeter.instance;
        var config = registry.getConfig();

        registry.setBlacklists(new Blacklists(config));
    }())
}

