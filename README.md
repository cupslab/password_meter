# Password Meter

This project implements a data-driven password meter. Its effects on password security and usability were evaluated in the following publication: Ur et al. "Design and Evaluation of a Data-Driven Password Meter." In the Proceedings of CHI, 2017. https://dl.acm.org/citation.cfm?id=3026050

The original implementation of this password meter has been extended to include additional support for minimum-strength and blocklist requirements. Password-policy configurations based on these new requirement types were evaluated in the following publication: J. Tan, L. Bauer, N. Christin, and L. F. Cranor. "Practical recommendations for stronger, more usable passwords combining minimum-strength, minimum-length, and blocklist requirements." In the Proceedings of CCS, 2020. https://dl.acm.org/doi/10.1145/3372297.3417882

This project uses the [Pwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) to check for previously leaked passwords.

The majority of this project is written in TypeScript, which transcompiles to JavaScript. Two JavaScript libraries ([hibp-js](https://github.com/mehdibo/hibp-js) and [bloom-filter-js](https://github.com/bbondy/bloom-filter-js)) were also used in this project, with minor modifications.

An online demo of the meter is available at https://cups.cs.cmu.edu/meter/


## Contact

password-guessability@cs.cmu.edu


## Deploying (minimal customization required)

Many potential users of the meter will not need to re-transcompile from TypeScript to JavaScript. Instead, such users can use the code in the /example directory, which contains a ready-to-run environment for the password meter. The primary HTML file is index.html. The password-policy requirements and other meter configuration can be set by editing parameters defined in config_policy_meter.js.

We expect that most people who take advantage of the example files will nonetheless edit three sets of common configurations that are made in "passwordMeterConfig" within the /example/index.html file: 

1) "domainSpecificWords" should be updated to contain a list of site-specific words that should count for nothing in the password. We currently provide a small set of examples specific to CMU.

2) A number of variables (minLogNnGuessNum, length, prohibitKnownLeaked, etc.) define the site's mandated password-composition policy. In the example file, it is set to require a 1c12+NN10 policy that also prohibits known leaked passwords reported by the Pwned Passwords API. The other dimensions are currently set to inactive, but can be enabled by simply editing these variables.

Beyond these configuration decisions, we expect that people who deploy our meter will edit the layout in /example/index.html and /example/config.css 

Note that running the meter's code locally (e.g., from your computer's local hard disk) with browsers' default settings will not load the dictionary files (dictionary-*), and as a result no feedback will be given based on the use of dictionary words or common passwords. In contrast, if loaded from a web server (e.g., Apache), these files will be loaded correctly.

Note also that the meter expects all files to be in the same directory as each other.


## Building from source

  * Install command line runnable npm and browserify (the latter via, e.g., "npm install -g browserify")
  * In the src directory, first run npm install to install dependencies
  * Then run npm run do-browserify to generate the PasswordMeter.js file
  * Place the PasswordMeter.js file with the other web files (i.e., in the /example directory)

Finally, the neural network that estimates password strength needs to be trained for a site's particular password-composition policy. The parameter files must be provided in the configuration. The example neural network files we provide (/example/tfjs_1c8/*) are trained for a 1class8 policy and may not provide accurate strength estimates for passwords created under different policies. For more detail on training the neural network, please see https://github.com/cupslab/neural_network_cracking


## Dependencies

Our meter depends on two common external web-development libraries:

  * JQuery (minified version 2.2.4 JS file used for testing) https://jquery.com/
  * Bootstrap (minified version 3.3.6 of both the CSS and JS file used for testing) http://getbootstrap.com/
  * lz-string.js http://pieroxy.net/blog/pages/lz-string/testing.html

Note that Bootstrap 3.x currently requires JQuery 2.x and is not compatible with JQuery version 3.x.


## Setup

To set up the meter, define the following global variables for the above dependencies before referencing the PasswordMeter.js file:-

  * $ for JQuery with Bootstrap
  * LZString for LZString
  * passwordMeterConfig for configuration (optional, will default to 1class8 policy)


## Details of /example files

We label each file with its intended purpose within the meter: main file; neural network computation; visual layout; dictionary; required external library

  * **tfjs_1c8/** Contains files describing TensorFlowJS saved model parameters, architecture, and JSON encoding of a pre-computed mapping of estimating a password's guess number from its probability by using Monte Carlo methods. These files are for a 1class8 policy, and for other policies should be retrained using https://github.com/cupslab/neural_network_cracking 

  * **bootstrap.min.css** (Required external library) The Bootstrap library (version 3.3.6), minified http://getbootstrap.com/

  * **bootstrap.min.js** (Required external library) The Bootstrap library (version 3.3.6), minified http://getbootstrap.com/

  * **config.css** (Visual layout) The primary configuration settings for the meter's visual design are located in this file. These settings include colors, fonts, sizes, and border radii.

  * **dictionary-blacklist1c8-compressed.txt** (Dictionary) An LZW compressed version of the 96,480 passwords containing at least 8 characters that appear in the Xato.net corpus of passwords at least four times.

  * **dictionary-englishwords-compressed.txt** (Dictionary) An LZW compressed version of 80,031 frequently used English words taken from the intersection of the BYU Corpus of Contemporary American English (COCA) and the UNIX dictionary.

  * **dictionary-names-compressed.txt** (Dictionary) An LZW compressed version of 4,937 male and female names popular in the United States, per recent census data.

  * **dictionary-passwords-compressed.txt** (Dictionary) An LZW compressed version of the 87,143 passwords of any length that appear at least 10 times in the Xato.net corpus.

  * **dictionary-phrases-compressed.txt** (Dictionary) An LZW compressed version of the 49,927 unique entries (after filtering out non-ascii and spaces) from the 100,000 top 3-word phrases (3-grams) used on Wikipedia.

  * **dictionary-wikipedia-compressed.txt** (Dictionary) An LZW compressed version of the 47,276 words that are among the 100,000 top single words (1-grams) used on Wikipedia and are not already captured by dictionary-englishwords-compressed.txt.

  * **index.html** The main file for our demo meter. This file contains the HTML layout for our demo meter and the options for configuring the password-composition policy. It references, directly or indirectly, all of the other files.

  * **jquery-2.2.4.min.js** (Required external library) The jquery library (version 2.2.4), minified. https://jquery.com/

  * **lz-string.js** (Required external library) A Javascript implementation of Lempel-Ziv-Welch (LZW) lossless compression. http://pieroxy.net/blog/pages/lz-string/testing.html

  * **nn-client.min.js** (Neural network computation) The main file for instantiating our artificial neural networks for calculating password guessability. This file loads worker.min.js as needed.

  * **PasswordMeter.js** (Main file) A Javascript file containing the functions used to score the password based on 21 different heuristics. It includes helper functions (mostly string and array prototypes), functions to verify that a password meets the minimum requirements of a given password-composition policy, and the functions that implement our heuristic scoring. This file is transcompiled from the set of TypeScript files in the /src/ts/ directory.

  * **nn-client.min.js** (Neural network computation) To calculate neural network guess numbers asynchronously (and thereby prevent interface lag), this file uses the WebWorker framework to spawn separate threads for calculating guess numbers for a password using neural networks.


## Characteristics 

We tested and iteratively updated many prioritizations of the feedback we provided users in the standard meter. For each advanced heuristic, if the associated function has feedback relevant to that particular password, it returns a non-empty string for both publicFeedback and sensitiveFeedback. If it does not have feedback, which occurs when that heuristic does not indicate a predictable pattern, it returns the empty string. We traverse the list of functions in descending priority for the first (up to) three pieces of feedback to give the user. If, however, our scoring functions rate the password such that its score fills the bar, we ignore all text feedback and tell the user that his or her password appears strong.

The list of functions that provide feedback, in descending order of priority, includes:

  * **contextual()** returns the password after removing the longest string of five or more contiguous characters of the password that overlap (case-insensitive) with the user's chosen username. If there is no such overlap, the function returns the original password.

  * **combinedDictCheck()** returns three values. First, it returns the number of characters in the password contained from any of the following sources: the 234 most popular pet names; the 2,500 most popular male and 2,500 most popular female names according to the U.S. census; the top 50,000 three-word phrases used on Wikipedia; frequently used English words taken from the intersection of the BYU Corpus of Contemporary American English (COCA) 100,000 most frequent 1-grams and the Unix dictionary; the 100,000 top single words (1-grams) used on Wikipedia. For each list, we removed those that were internal duplicates (e.g., some common male and female names are identical, and some distinct three-word phrases appear the same after removing spaces and punctuation), and we also removed any that appeared on a list above it (following the order listed above) or was a keyboard pattern, string of a single character repeated, or alphabetic/numeric sequence. In addition to checking for these words in a case-insensitive manner, we also evaluate whether a transformation of these words is present by reversing all instances of the 10 most common character substitutions in passwords. For instance, if the user's password contains a "4," we will evaluate whether replacing that character by an "a" or "for" leads to the password containing a dictionary word. The commonness of the substitution (what percentage of all substitutions follow that particular rule is the second value returned by this function. It also returns the number of distinct dictionary tokens (e.g., a password that contains two separate dictionary words contains two tokens) as the third value.

  * **keyboardPatterns()** returns the total number of characters of a password contained in one or more keyboard patterns. We define a keyboard pattern to be 4+ characters in a row for which the inter-key x-y coordinate change on a physical QWERTY keyboard layout is the same. For instance, "qetu" would be a keyboard pattern because each inter-key coordinate change is 2 keys to the right horizontally, and no change vertically. Note that we only consider a string to be a keyboard pattern if the inter-key vector on a QWERTY keyboard is identical. While some keyboard patterns in practice could include snake-like bends, they would lead to many false positives (e.g., "reds," "polk") and common keyboard patterns of that type would be identified as a common password substring, so we do not look for them.

  * **repeats()** returns the number of characters in the longest string of at least 3+ consecutive, repeated characters (e.g., "monkeeey" returns 3, while "monkeey" returns 0) in the password.

  * **identifyDates()** returns the number of characters in the password contained in a date. We use the common ways of writing dates observed by Veras et al. in their investigation of the use of dates in passwords from the RockYou breach. We search for dates in MM-DD-YYYY, DD-MM-YYYY, MM-DD-YY, and DD-MM-YY format using the following delimiters: space; period; hyphen; forward slash. We subsequently search for dates in MMDDYYYY and DDMMYYYY format without any delimiters. We also search for written-out months (e.g., "april") and recent years (4 digits or 2 digits). We also search for MM-DD and DD-MM dates using the following delimiters: space; period; hyphen; forward slash. Finally, we search for recent years (1900 through 2049).

  * **repeatedSections()** returns the number of characters in the password that repeat, either forwards or backwards, a string of 3+ characters that appeared earlier in the password (case insensitive) . For instance, "monkey" returns 0, "monkeymonkey" and "monkeyyeknom" would each return 6, while "monkeymonkey123yeknom" would return 12.

  * **alphabeticSequenceCheck()** return the number of characters that are part of alphabetic sequences (e.g., "abc" or "aceg") or numerical sequences (e.g., "123" or "1357") that are at least 3 characters long and are defined using the difference in ASCII codes between adjacent characters. If the inter-character difference in ASCII codes is the same, the elements in that string or substring are an alphabetic sequence. If there are multiple such sequences, it returns the sum of the number of characters in each.

  * **commonpwCheck()** returns the length of the longest substring of the password that is itself one of the passwords that appears at least 10 times in the Xato.net corpus of 10 million passwords.

  * **uppercasePredictable()** returns 1 (true) or 0 (false) whether the usage of uppercase characters in this password is predictable. To determine predictability, we examined capitalization patterns in the 10 million Xato passwords. The two most common capitalization patterns, which are thus the ones we label as predictable, are capitalizing only the first character and using all uppercase characters.

  * **digitsPredictable()** returns 1 (true) or 0 (false) whether the location of digits in this password is predictable. To determine predictability, we examined patterns in the location of digits in the 10 million Xato passwords. The patterns we identified as predictable are constructing the password exclusively of digits, putting the digits in one group at the beginning of the password, and putting the digits in one group at the end of the password.

  * **symbolsPredictable()** returns 1 (true) or 0 (false) whether the location of symbols in this password is predictable. To determine predictability, we examined patterns in the location of symbols in the 10 million Xato passwords. The patterns we identified as predictable are putting the symbols in one group at the end of the password or constructing the password as letters-symbols-digits.

  * **duplicatedCharacters()** returns the total number of characters that are duplicates of characters used previously in the password. The repetition of characters does not need to be consecutive. For instance, "zcbm" contains 0 duplicated characters, "zcbmcb" contains 2 duplicated characters, and "zcbmbb" also contains 2 duplicated characters.

  * **pwLength()** returns the total number of characters in the password.

  * **countSYMS()** returns the number of symbols contained in the password.

  * **countUC()** returns the number of uppercase letters contained in the password.

  * **countDIGS()** returns the number of digits contained in the password.

  * **countLC()** returns the number of lowercase letters contained in the password.

  * **commonsubstringCheck()** returns the number of characters in the password that are common substrings in passwords. We require that these substrings contain 4-8 characters and occur at least 2,000 times each among the 10 million Xato passwords. We build the list of common substrings in order of decreasing length, ignoring potential substrings that are themselves substrings already on our list. For instance, if we identify "monkey" as a common substring, will not add "monke" to the list of common substrings. In total, we identified 2,385 substrings that met these criteria.

  * **structurePredictable()** identifies how common the character-class structure (e.g., "6 lowercase letters, followed by 2 digits") of the password is. It returns a number between 1 (Nth most common structure) and N (most common structure). We are currently using N = 2,124 structures based on our work on adaptive password-composition policies.

  * **characterClasses()** returns the number of different character classes (1-4) in the password


## Initial Project Contributors

Felicia Alfieri, Maung Aung, Lujo Bauer, Nicolas Christin, Jessica Colnago, Lorrie Faith Cranor, Henry Dixon, Pardis Emami Naeini, Hana Habib, Noah Johnson, William Melicher, Michael Stroucken, and Blase Ur* at Carnegie Mellon University and (*)the University of Chicago, United States.

