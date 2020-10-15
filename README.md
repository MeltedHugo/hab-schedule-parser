# hab-schedule-parser
Parses the current schedule of lectures at the University of Applied Sciences Aschaffenburg to JSON files

~~At the moment, output from my own instance of this parser is synced to another repository every 30 minutes: [h-ab-schedule](https://github.com/Hugobert/h-ab-schedule). Head there if you just want access to the data.~~ I used to run my own instance of this parser for a while but it is no longer running due to me no longer studying. Also I am no longer actively updating this but if you want this to stay updated (in case the website gets an update as well) just write an issue or submit a pull request, thanks.

## Binaries
If working with source code and Node.js is too complicated for you, just download the executable suited for your system [here](https://github.com/Hugobert/hab-schedule-parser/releases/latest). These should work out of the box without the need for any other software. Keep in mind that running those will try to create a directory named "json" in the folder they are executed in.

If you prefer working with the source code, continue reading.

## Requirements
* Node.js with npm
* An internet connection
* Permission to create folders in the current directory

## How to use
1. Clone this repository.
2. Run `npm install` to install the dependencies.
3. Run `npm start` or `node main.js` to start the program.

## Contribution
If you find bugs or have ideas for improving this software, feel free to open an issue or a pull request.
