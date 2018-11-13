const request = require('request'); // To get website data
const fs = require('fs'); // To output files
var cheerio = require('cheerio'); // To work with html data
var cheerioTableparser = require('cheerio-tableparser'); // The most useful tool to parse those pesky tables.
var he = require('he'); // To decode HTML entities to utf-8 strings

if (!fs.existsSync('./json')){
	console.log("Creating directory: ./json")
	fs.mkdirSync('./json');
}

getEverything();

function getPlan(kategorie){

	// Open timetable website of class
	request('https://www.h-ab.de/fileadmin/dokumente/stundenplan/klassisch/'+kategorie+'.html', function (error, response, body) {
	
		// If website is offline
		if(error){
			console.log("Error fetching website "+kategorie);
			return;
		}

		$ = cheerio.load(body);

		// Remove footnotes
		$( ".fn" ).remove();
		$( ".fnft" ).remove();
		$('span').remove();

		var plan = {};
		var vl = [];
		var tblNumber = 0;

		// For each week:
		$('table').each(function () {
			tblNumber += 1;

			// Parse week
			var parsed = parseWeek(this);
			
			plan[tblNumber] = parsed[0];
			vl.push(parsed[1]);

		})

		// Done
		var currTime = new Date();
		planFinal = {timeCreated: currTime, plan: plan};
		vlFinal = {timeCreated: currTime, vl: vl};
		makePlainLists(kategorie, vlFinal.vl);

		
		/*********************************
		 * THE MAIN PARSING HAPPENS HERE *
		 ********************************/

		function parseWeek(week) {
			$w = cheerio.load(week);
			cheerioTableparser($w);
			var data = $w("table").parsetable(true, false, false);
			// Read more about the cheerio tableparser here:
			// https://www.npmjs.com/package/cheerio-tableparser


			var woche= [];
			for(var i=3;i<data.length;i++){
				// Get rid of empty or meaningless cells (There are a lot of them)
				var col = data[i].filter(function (el) {
					return el != "&#xA0;"&& el != "";
				});

				if(col.length>1){
					woche.push(col);
				}
			}

			// Remove time column
			woche.splice(-1,1);

			// Sort "double lectures" (that happen at the same time at the same day simultaneously) into correct day array
			for(var i=1;i<woche.length;i++){
				if (woche[i][0] === woche[i-1][0]){
					for (var j=1;j<woche[i].length;j++){
						woche[i-1].push(woche[i][j])
					}
					woche[i]="";
				}
			}

			// Remove empty elements
			var woche = woche.filter(function (el) {
				return el != "";
			});

			// We now have a nice array (woche) for that week.
			// This needs to me converted into a well-readable object

			var weekObject = {};
			var vorlesungArray = [];
			var weekNum = 0;

			woche.forEach(function(tag){
				var vorlesungen = tag.slice(1);
				var vorlesungObject = {};
				
				vorlesungen.forEach(function(vorlesung){
					// This checks if there is enough information. Some courses don't provide much information, this helps mitigate this problem.
					if(vorlesung.split("<br>").length<4){
						uhrzeit = returnLastItem(vorlesung.split("<br>")[0].split(">"));
						name = he.decode(vorlesung.split("<br>")[1]);
						gruppe = he.decode(returnLastItem(vorlesung.split("<br>")).split("</a>")[0].split("<")[0]);
						prof = "";
						raum = "";
					// This is the normal behavior:
					} else {
						uhrzeit = returnLastItem(vorlesung.split("<br>")[0].split(">"));
						name = he.decode(vorlesung.split("<br>")[1]);
						prof = he.decode(vorlesung.split("<br>")[2]);
						raum = he.decode(vorlesung.split("<br>")[3].split("<")[0]);
						gruppe = he.decode(returnLastItem(vorlesung.split("<br>")).split("</a>")[0].split("<")[0]);
					}

					vorlesungObject = {
						vorlesung: name,
						datum: tag[0],
						zeit: uhrzeit,
						dozent: prof,
						raum: raum,
						gruppe: gruppe,
						timestamp: parseDate(tag[0],uhrzeit)
					}

					vorlesungArray.push(vorlesungObject)
				})
				
				weekObject[weekNum] = vorlesungObject;
				weekNum++;
			});
			

			// Returns the last item of an array without modifying it
			function returnLastItem(array){
				return array[array.length-1];
			}

			// Parses the date and time from strings and returns a timestamp
			function parseDate(tag,uhrzeit){
				var origStr = tag;
				var origTime = uhrzeit;

				//var oDay = parseInt(origStr.split(",")[0]); // This just returns the name of the day. Useless.
				var oDate = parseInt(origStr.split(", ")[1].split(".")[0]);
				var oMonth = parseInt(origStr.split(", ")[1].split(".")[1])-1;

				

				var oTimeStart = origTime.split(" - ")[0];
				var oTimeStartHours = parseInt(oTimeStart.split(":")[0]);
				var oTimeStartMinutes = parseInt(oTimeStart.split(":")[1]);


				var parsedDate = new Date();
				parsedDate.setMonth(oMonth);
				parsedDate.setDate(oDate);
				parsedDate.setHours(oTimeStartHours);
				parsedDate.setMinutes(oTimeStartMinutes);
				parsedDate.setSeconds(0);
				parsedDate.setMilliseconds(0);

				parsedDate.setFullYear(fixYear(parsedDate));

				// Since years are not provided in the table, we need to determine which year it is talking about.
				// Usually is the current year, but can also be next year.
				function fixYear(parsedDate){
					var currentDate = new Date();
					var currentYear = currentDate.getFullYear();
					var difference = currentDate - parsedDate;
					// If the script assumes it's too far in the past, then it must be in the future (i.e. next year)
					if(difference > 12960000000){
						correctYear = currentYear + 1;
					} else {
						correctYear = currentYear;
					}
					return correctYear;
				}

				return parsedDate;
			}


			return [weekObject,vorlesungArray];
		}


	});
}


// Check which courses exist.
function getEverything(){
	// This site has a handy list of all currently running classes:
	request('https://www.h-ab.de/fileadmin/dokumente/stundenplan/klassisch/index.html', function (error, response, body) {

		$ = cheerio.load(body);

		var list = [];

		// A prototype method to remove an element from an array by specifying a string
		Array.prototype.remove = function() {
			var what, a = arguments, L = a.length, ax;
			while (L && this.length) {
				what = a[--L];
				while ((ax = this.indexOf(what)) !== -1) {
					this.splice(ax, 1);
				}
			}
			return this;
		};

		// Collect the short names of the classes (the significant part of the respective URLs)
		$('a').each(function(){
			var link = $(this).attr("href").split(".html")[0];
			list.push(link);
		})

		// This gets parsed too, but since it's not a class, we don't want this.
		list.remove("http://www.sked.de");

		// Output the list to a file.
		fs.writeFileSync("json/CLASSLIST.json", JSON.stringify(list));

		// Now do some work
		list.forEach(function(kat){
			getPlan(kat,list);
		})
	})
}

// The last step: Cleaning up.
function makePlainLists(kategorie, all){
	var upcoming = [];

	// Get rid of the weeks
	all.forEach(function(woche){
		woche.forEach(function(vl){
			upcoming.push(vl);
		})
	})

	// Sort the whole thing by date
	upcoming.sort(function(a,b){
		return new Date(a.timestamp) - new Date(b.timestamp);
	})

	// Output to file
	if (upcoming.length > 0) {
		fs.writeFileSync("json/"+kategorie+".json", JSON.stringify(upcoming));
		console.log("Generated successfully: "+kategorie+".json");
	}

}