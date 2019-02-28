import PasswordMeter = require("./PasswordMeter");
import Helper = require("./helper");
import * as BloomFilter from "./bloom-filter-js";
import Config = require("./config");

export module Dictionaries {
    export type Dictionary = { [key: string]: boolean };
    export type BloomFilter = BloomFilter.BloomFilter;

    export class Dictionaries {

        namesDict: Dictionary;
        phrasesDict: Dictionary;
        passwordsDict: Dictionary; // josh: keep around; used in rulefunction.ts > commonPwCheck
        // load dictionary-passwords-compressed.txt into it
        englishwordsDict: Dictionary;
        blacklistDict: Dictionary; // josh: use this for blacklist rule, not passwordsDict
        blacklistBloom: BloomFilter;
        wikipediaDict: Dictionary;
        petnames: Dictionary;

        blacklistRejects: (stringToCheck: string) => boolean;

        constructor(config: Config.Config.Config) {
            var helper: Helper.Helper.Helper = PasswordMeter.PasswordMeter.instance.getHelper();

            // if (config.blacklist.checkSubstrings) {
            //     this.blacklistBloom = helper.compressedFileToBloomFilter(config.blacklist.blacklistFile,
            //         config.blacklist.checkSubstringLength);
            //     this.blacklistDict = null;
            //     this.blacklistRejects = function(stringToCheck) {
            //         return this.blacklistBloom.substringExists(stringToCheck,
            //             config.blacklist.checkSubstringLength);
            //     };

            // } else {
            //     this.blacklistBloom = null;
            //     this.blacklistDict = helper.compressedFileToDict(config.blacklist.blacklistFile);
            //     this.blacklistRejects = function(stringToCheck) {
            //         return this.blacklistDict[stringToCheck];
            //     };
            // }


            if (!config.blacklist.checkSubstrings) {
                this.blacklistRejects = function(stringToCheck) {
                    return this.blacklistDict[stringToCheck];
                }
            } else {
                this.blacklistRejects = function(stringToCheck) {
                    return this.blacklistBloom.substringExists(stringToCheck, config.blacklist.checkSubstringLength);
                }
            }

            this.blacklistDict = helper.compressedFileToDict(config.blacklist.blacklistFile);
            this.blacklistBloom = helper.compressedFileToBloomFilter(config.blacklist.blacklistFile, config.blacklist.checkSubstringLength);
            this.passwordsDict = helper.compressedFileToDict("dictionary-passwords-compressed.txt");
            this.namesDict = helper.compressedFileToDict("dictionary-names-compressed.txt");
            this.phrasesDict = helper.compressedFileToDict("dictionary-phrases-compressed.txt");
            this.englishwordsDict = helper.compressedFileToDict("dictionary-englishwords-compressed.txt");
            this.wikipediaDict = helper.compressedFileToDict("dictionary-wikipedia-compressed.txt");

            // potentialTODO shouldn't we load this?
            this.petnames = {};
            var temppetnames = ["abbey", "abby", "alex", "allie", "amber", "angel", "annie", "ashley", "baby", "bailey", "bandit", "barney", "baxter", "bear", "beau", "bella", "belle", "bentley", "blackie", "blue", "bonnie", "boomer", "boots", "bosco", "brady", "brandy", "bruno", "brutus", "bubba", "buddy", "buffy", "buster", "cali", "callie", "calvin", "casey", "casper", "cassie", "champ", "chance", "charlie", "chase", "chelsea", "chester", "chico", "chloe", "cleo", "cleopatra", "clyde", "coco", "cocoa", "cody", "cookie", "cooper", "cosmo", "daisy", "dakota", "dexter", "diesel", "dixie", "duke", "duncan", "dusty", "ella", "ellie", "elvis", "emily", "emma", "felix", "fiona", "fluffy", "frankie", "fred", "gabriel", "garfield", "george", "gigi", "ginger", "gizmo", "grace", "gracie", "guinness", "haley", "hannah", "harley", "harry", "heidi", "henry", "holly", "honey", "hunter", "isabella", "isis", "jack", "jackson", "jade", "jake", "jasmine", "jasper", "jessie", "joey", "junior", "katie", "kiki", "kitty", "kobe", "lacey", "lady", "lexi", "lexie", "libby", "lilly", "lily", "loki", "lola", "louie", "lucky", "lucy", "luke", "lulu", "luna", "maddie", "madison", "maggie", "mandy", "marley", "maximus", "maxwell", "maya", "merlin", "mickey", "midnight", "mikey", "millie", "milo", "mimi", "minnie", "misskitty", "missy", "misty", "mittens", "mocha", "molly", "moose", "morgan", "muffin", "murphy", "nala", "nikki", "oliver", "olivia", "oreo", "oscar", "otis", "patches", "peaches", "peanut", "pebbles", "penny", "pepper", "phoebe", "piper", "precious", "prince", "princess", "pumpkin", "rascal", "riley", "rocco", "rocky", "romeo", "roscoe", "rosie", "roxie", "roxy", "ruby", "rudy", "rufus", "rusty", "sabrina", "sadie", "samantha", "sammy", "sampson", "samson", "sandy", "sarah", "sasha", "sassy", "scooter", "scout", "sebastian", "shadow", "sheba", "shelby", "sierra", "simba", "simon", "smokey", "snoopy", "snowball", "socks", "sonny", "sophia", "sophie", "sparky", "spencer", "spike", "stalla", "stella", "sugar", "sunny", "sydney", "sylvester", "tabitha", "tasha", "teddy", "thomas", "tiger", "tigger", "tinkerbell", "toby", "tommy", "trixie", "tucker", "tyson", "willie", "willow", "winston", "xena", "yoda", "zeus", "ziggy", "zoey"];

            for (var i = 0; i < temppetnames.length; i++) {
                this.petnames[temppetnames[i]] = true;
            }
        }
    }

    (function() {
        var registry = PasswordMeter.PasswordMeter.instance;
        var config = registry.getConfig();

        registry.setDictionaries(new Dictionaries(config));
    }())
}

