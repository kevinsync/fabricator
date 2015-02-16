/**
 * Collate "materials" - html and md files
 * @description Gets contents of files, parses, and creates JSON
 */

'use strict';

var beautifyHtml = require('js-beautify').html;
var changeCase = require('change-case');
var cheerio = require('cheerio');
var fs = require('fs');
var gutil = require('gulp-util');
var Handlebars = require('handlebars');
var junk = require('junk');
var markdown = require('markdown-it')({ langPrefix: 'language-' });
var mkpath = require('mkpath');
var path = require('path');


/**
 * Compiled component/structure/etc data
 * @type {Object}
 */
var data;


// configure beautifier
var beautifyOptions = {
	'indent_size': 1,
	'indent_char': '    ',
	'indent_with_tabs': true
};


/**
 * Register each component and structure as a helper in Handlebars
 * This turns each item into a helper so that we can
 * include them in other files.
 */
var registerHelper = function (item) {

	Handlebars.registerHelper(item.helper_id, function () {

    var args = null;
    
		// get helper classes if passed in
		var helperClasses = (typeof arguments[0] === 'string') ? arguments[0] : '';

    // attempt to parse optional argument as JSON
    try { args = JSON.parse(arguments[0]); } catch (e) { };

    // init cheerio
    var $ = cheerio.load(item.content);

    // if argument is string
    if ((typeof arguments[0] === "string") && (args === null)) {

      // add helper classes to first element
      $('*').first().addClass(arguments[0]);

    } else

    // if argument is JSON
    if ((typeof args === "object") && (args !== null)) {

      // iterate properties of argument
      for (var i in args) {

        switch (i.toLowerCase()) {

          case "text":

            // replace children with updated text if applicable
            $('*').first().text(args[i]);

            break;

          case "class":
          case "classname":

            // add helper classes to first element
            $('*').first().addClass(helperClasses);

            break;

          case "data":

            // populate children with data if applicable

            try {

              var row = item.data[args[i]];

              for (var x in row) {

                switch (typeof row[x]) {

                  case "string":

                    $(x).text(row[x]);

                    break;

                  case "object":

                    for (var attr in row[x]) {

                      $(x).attr(attr, row[x][attr]);

                    } // end for

                    break;

                } // end switch

              } // end for

            } catch (e) {};

            break;

          default:

            // set custom attributes
            $('*').first().attr(i, args[i]);

            break;

        } // end switch

      } // end for

    } // end if
		return new Handlebars.SafeString($.html());

	});

};


/**
 * Block iteration
 * @description Repeat a block a given amount of times.
 * @example
 * {{#iterate 20}}
 *   <li>List Item {{@index}}</li>
 * {{/iterate}}
 */
Handlebars.registerHelper('iterate', function (n, block) {
	var accum = '', data;
	for (var i = 0; i < n; ++i) {
		if (block.data) {
			data = Handlebars.createFrame(block.data || {});
			data.index = i;
		}
		accum += block.fn(i, {data: data});
	}
	return accum;
});


/**
 * Parse a directory of files
 * @param {Sting} dir The directory that contains .html and .md files to be parsed
 * @return {Function} A stream
 */
var parse = function (dir) {

	// create key if it doesn't exist
	if (!data[dir]) {
		data[dir] = {};
	}

	// get directory contents
	var raw = fs.readdirSync('src/toolkit/' + dir).filter(junk.not);

	// create an array of file names
	var fileNames = raw.map(function (e, i) {
		return e.replace(path.extname(e), '');
	});

	// de-dupe file names (both .html and .md present)
	var items = fileNames.filter(function (e, i, a) {
		return a.indexOf(e) === i;
	});

	// iterate over each item, parse, add to item object
	for (var i = 0, length = items.length; i < length; i++) {

		var item = {};

		item.id = items[i];
		item.helper_id = item.id.replace(/(^[0-9.]+)(__|)/, "").trim();
		item.name = changeCase.titleCase(item.id.replace(/-/ig, ' ')).replace(/(^[0-9.]+)(__|)/, "").trim();
		item.exclude = item.id.match(/(^[0-9\.]+)(__)/, "");

		try {
			// compile templates
			var content = fs.readFileSync('src/toolkit/' + dir + '/' + items[i] + '.html', 'utf8').replace(/(\s*(\r?\n|\r))+$/, '');
			var template = Handlebars.compile(content);
			item.content = beautifyHtml(template(), beautifyOptions);
			// register the helper
			registerHelper(item);
		} catch (e) {}

		try {
			var notes = fs.readFileSync('src/toolkit/' + dir + '/' + items[i] + '.md', 'utf8');
			item.notes = markdown.render(notes);
		} catch (e) {}

		try {
			var item_data = fs.readFileSync('src/toolkit/' + dir + '/' + items[i] + '.json', 'utf8');
			item.data = JSON.parse(item_data);
		} catch (e) {}

		data[dir][item.id.replace(/-/g, '')] = item;
	}

};


module.exports = function (opts, cb) {

	data = {};

	// iterate over each "materials" directory
	for (var i = 0, length = opts.materials.length; i < length; i++) {
		parse(opts.materials[i]);
	}

	// write the json file
	mkpath.sync(path.dirname(opts.dest));

	fs.writeFile(opts.dest, JSON.stringify(data), function (err) {
		if (err) {
			gutil.log(err);
		} else {
			cb();
		}
	});

};
