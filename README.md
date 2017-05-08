# Password Meter

This project implements a data-driven password meter. Its effects on password security and usability were evaluated in the following publication: Ur et al. "Design and Evaluation of a Data-Driven Password Meter." In the Proceedings of CHI, 2017.

The project is written in TypeScript, which transcompiles to JavaScript.

An online demo of the meter is available at https://cups.cs.cmu.edu/meter/


## Contact

password-guessability@cs.cmu.edu


## Deploying (minimal customization required)

Many potential users of the meter will not need to re-transcompile from TypeScript to JavaScript. Instead, such users can use the code in the /example directory, which contains a ready-to-run environment for the password meter. The primary HTML file is index.html. 

We expect that most people who take advantage of the example files will nonetheless edit three sets of common configurations that are made in "passwordMeterConfig" within the /example/index.html file: 

1) "ignoredWords" should be updated to contain a list of site-specific words that should count for nothing in the password. We currently provide a small set of examples specific to CMU.

2) A number of variables (length, classCount, classRequire, classAllow, forbidPasswords, forbidChars, repeatChars, and usernameDifference) define the site's mandated password-composition policy. In the example file, it is set to require only that passwords contain 8 or more characters and are not one of 25 extremely common passwords. The other dimensions are currently set to inactive, but can be enabled by simply editing these variables.

3) An additional variable (forbiddenPasswords) specifies whether or not to forbid passwords on a larger blacklist of ~100,000 common passwords taken from Mark Burnett's Xato.net corpus. In our example, it is currently set to active. For our research supporting this decision, please see: http://www.blaseur.com/papers/usec2017-blacklists.pdf

Beyond these configuration decisions, we expect that people who deploy our meter will edit the layout in /example/index.html and /example/config.css 

Note that running the meter's code locally (e.g., from your computer's local hard disk) with browsers' default settings will not load the dictionary files (dictionary-*), and as a result no feedback will be given based on the use of dictionary words or common passwords, nor will the blacklist be active. In contrast, if loaded from a web server (e.g., Apache), these files will be loaded correctly.

Note also that the meter expects all files to be in the same directory as each other.


## Building from source

  * Install command line runnable npm and browserify (the latter via, e.g., "npm install -g browserify")
  * In the src directory, first run npm install to install dependencies
  * Then run npm run do-browserify to generate the PasswordMeter.js file
  * Place the PasswordMeter.js file with the other web files (i.e., in the /example directory)

Finally, the neural network that estimates password strength needs to be trained for a site's particular password-composition policy. The parameter files must be provided in the configuration. The example neural network files we provide (/example/basic_3M.*) are trained for a 1class8 policy and will not provide accurate strength estimates for passwords created under different policies. For more detail on training the neural network, please see https://github.com/cupslab/neural_network_cracking


### Setup

To set up the meter, define the following global variables before referencing the PasswordMeter.js file:-

$ for JQuery with Bootstrap
LZString for LZString
passwordMeterConfig for configuration (optional, will default to basic8 policy)


## Initial Project Contributors

Felicia Alfieri, Maung Aung, Lujo Bauer, Nicolas Christin, Jessica Colnago, Lorrie Faith Cranor, Henry Dixon, Pardis Emami Naeini, Hana Habib, Noah Johnson, William Melicher, Michael Stroucken, and Blase Ur* at Carnegie Mellon University and the University of Chicago(*), United States.
