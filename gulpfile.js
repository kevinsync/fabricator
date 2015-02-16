'use strict';

// modules
var browserify = require('browserify');
var browserSync = require('browser-sync');
var collate = require('./tasks/collate');
var compile = require('./tasks/compile');
var concat = require('gulp-concat');
var connect = require('gulp-connect');
var csso = require('gulp-csso');
var es = require('event-stream');
var del = require('del');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var plumber = require('gulp-plumber');
var prefix = require('gulp-autoprefixer');
var Q = require('q');
var rename = require('gulp-rename');
var reload = browserSync.reload;
var runSequence = require('run-sequence');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');


// configuration
var config = {
	dev: true,
	src: {
		scripts: {
			fabricator: [
				'./src/fabricator/scripts/prism.js',
				'./src/fabricator/scripts/fabricator.js'
			],
			toolkit: './src/toolkit/assets/scripts/toolkit.js',
			modernizr: './src/toolkit/assets/scripts/vendor/modernizr-latest.dev.js',
			lib: [
				'./src/toolkit/assets/scripts/vendor/sizzle.min.js',                      // http://sizzlejs.com
				'./src/toolkit/assets/scripts/vendor/bonzo.js',                           // https://github.com/ded/bonzo
				'./src/toolkit/assets/scripts/vendor/bean.js',                            // https://github.com/fat/bean
				'./src/toolkit/assets/scripts/vendor/ready.js',                           // https://github.com/ded/domready
				'./src/toolkit/assets/scripts/vendor/idangerous.swiper.min.js',           // http://www.idangero.us/sliders/swiper
				'./src/toolkit/assets/scripts/vendor/idangerous.swiper.scrollbar.min.js', // http://www.idangero.us/sliders/swiper/plugins/scrollbar.php
				'./src/toolkit/assets/scripts/vendor/liga.js',                            // http://icomoon.io,
				'./src/toolkit/assets/scripts/functional-extensions.js'                   // author: Kevin Kaiser (kkaiser@resourceammirati.com)
			]
		},
		styles: {
			fabricator: './src/fabricator/styles/fabricator.scss',
			toolkit: './src/toolkit/assets/styles/toolkit.scss',
			lib: [
				'./src/toolkit/assets/styles/vendor/idangerous.swiper.css',               // http://www.idangero.us/sliders/swiper
				'./src/toolkit/assets/styles/vendor/idangerous.swiper.scrollbar.css'      // http://www.idangero.us/sliders/swiper/plugins/scrollbar.php
			]
		},
		images: 'src/toolkit/assets/images/**/*',
		fonts: 'src/toolkit/assets/fonts/**/*',
		views: './src/toolkit/views/*.html',
		materials: [
			'components',
			'structures',
			'templates',
			'documentation'
		]
	},
	dest: './public'
};


// clean
gulp.task('clean', function (cb) {
	del([config.dest], cb);
});


// styles
gulp.task('styles:fabricator', function () {
	return gulp.src(config.src.styles.fabricator)
		.pipe(plumber())
		.pipe(sass({
      outputStyle: !config.dev ? 'compressed' : null,
			errLogToConsole: true
		}))
		.pipe(prefix('last 1 version'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(rename('f.css'))
		.pipe(gulp.dest(config.dest + '/fabricator/styles'))
		.pipe(gulpif(config.dev, connect.reload({stream:true})));
});

gulp.task('styles:css', function () {
	return gulp.src(config.src.styles.lib)
    .pipe(plumber())
		.pipe(concat('vendor.css'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(gulp.dest(config.dest + '/toolkit/styles'));
});

gulp.task('styles:toolkit', function () {
	return gulp.src(config.src.styles.toolkit)
		.pipe(plumber())
		.pipe(sass({
      outputStyle: !config.dev ? 'compressed' : null,
			errLogToConsole: true
		}))
		.pipe(prefix('last 1 version'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(gulp.dest(config.dest + '/toolkit/styles'))
		.pipe(gulpif(config.dev, connect.reload({stream:true})));
});

gulp.task('styles', ['styles:fabricator', 'styles:css', 'styles:toolkit']);


// scripts
gulp.task('scripts:fabricator', function () {
	return gulp.src(config.src.scripts.fabricator)
		.pipe(plumber())
		.pipe(concat('f.js'))
		.pipe(gulpif(!config.dev, uglify()))
		.pipe(gulp.dest(config.dest + '/fabricator/scripts'));
});

gulp.task('scripts:vendor', function () {
	return gulp.src(config.src.scripts.lib)
		.pipe(concat('vendor.js'))
		.pipe(gulp.dest(config.dest + '/toolkit/scripts'));
});

gulp.task('scripts:toolkit-source', ['scripts:vendor'], function () {
	return browserify(config.src.scripts.toolkit).bundle()
		.pipe(source('toolkit-source.js'))
		.pipe(gulp.dest(config.dest + '/toolkit/scripts'));
});

gulp.task('scripts:toolkit', ['scripts:toolkit-source'], function () {

  var files = [config.dest + '/toolkit/scripts/vendor.js',
               config.dest + '/toolkit/scripts/toolkit-source.js'
              ];

  return gulp.src(files)
		.pipe(concat('toolkit.js'))
		.pipe(gulpif(!config.dev, uglify()))
		.pipe(gulp.dest(config.dest + '/toolkit/scripts'))
		.pipe(gulpif(config.dev, connect.reload()));

});

gulp.task('scripts:toolkit-clean', ['scripts:toolkit'], function () {

  var files = [config.dest + '/toolkit/scripts/vendor.js',
               config.dest + '/toolkit/scripts/toolkit-source.js'
              ];

  del(files);

});

gulp.task('scripts:modernizr', function () {
	return gulp.src(config.src.scripts.modernizr)
		.pipe(uglify())
		.pipe(gulp.dest(config.dest + '/toolkit/scripts'));
});

gulp.task('scripts', ['scripts:fabricator', 'scripts:toolkit-clean', 'scripts:modernizr']);


// images
gulp.task('images', ['favicon'], function () {
	return gulp.src(config.src.images)
		.pipe(imagemin())
		.pipe(gulp.dest(config.dest + '/toolkit/images'));
});

gulp.task('favicon', function () {
	return gulp.src('./src/favicon.ico')
		.pipe(gulp.dest(config.dest));
});

gulp.task('fonts', function () {
	return gulp.src(config.src.fonts)
		.pipe(gulp.dest(config.dest + '/toolkit/fonts'));
});


// collate
gulp.task('collate', function () {

	// 'collate' is a little different -
	// it returns a promise instead of a stream

	var deferred = Q.defer();

	var opts = {
		materials: config.src.materials,
		dest: config.dest + '/fabricator/data/data.json'
	};

	// run the collate task; resolve deferred when complete
	collate(opts, deferred.resolve);

	return deferred.promise;

});

// assembly
gulp.task('assemble:fabricator', function () {
	var opts = {
		data: config.dest + '/fabricator/data/data.json',
		template: false
	};

	return gulp.src(config.src.views)
		.pipe(compile(opts))
		.pipe(gulp.dest(config.dest));
});

gulp.task('assemble:templates', function () {
	var opts = {
		data: config.dest + '/fabricator/data/data.json',
		template: true
	};
	return gulp.src('./src/toolkit/templates/*.html')
		.pipe(compile(opts))
		.pipe(rename({
			prefix: 'template-'
		}))
		.pipe(gulp.dest(config.dest));
});

gulp.task('assemble', ['collate'], function () {
	gulp.start('assemble:fabricator', 'assemble:templates');
});


// build
gulp.task('build', ['clean'], function () {
	gulp.start('styles', 'scripts', 'images', 'fonts', 'assemble');
});


// server
gulp.task('browser-sync', function () {
	browserSync({
		server: {
			baseDir: config.dest
		},
		notify: false
	});
});


// watch
gulp.task('watch', ['browser-sync'], function () {
	gulp.watch('src/toolkit/{components,structures,templates,documentation,views}/**/*.{html,md,json}', ['assemble', browserSync.reload]);
	gulp.watch('src/fabricator/styles/**/*.scss', ['styles:fabricator']);
	gulp.watch('src/toolkit/assets/styles/**/*.scss', function () {
		runSequence('styles:css', 'styles:toolkit', browserSync.reload);
	});
	gulp.watch('src/fabricator/scripts/**/*.js', ['scripts:fabricator', browserSync.reload]);
	gulp.watch('src/toolkit/assets/scripts/**/*.js', ['scripts:toolkit-clean', browserSync.reload]);
	gulp.watch(config.src.images, ['images', browserSync.reload]);
	gulp.watch(config.src.fonts, ['fonts', browserSync.reload]);
});


// development environment
gulp.task('dev', ['build'], function () {
	gulp.start('watch');
});


// default build task
gulp.task('default', function () {
	config.dev = false;
	gulp.start('build');
});
