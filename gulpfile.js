require('babel-core/register');

const isparta = require('isparta');
const gulp = require('gulp');
const babel = require('gulp-babel');
const jasmine = require('gulp-jasmine');
const istanbul = require('gulp-istanbul');

gulp.task('default', [ 'build', 'test' ]);

gulp.task('build', ['build:src']);

gulp.task('build:src', () =>
    gulp.src('src/**/*.js')
        .pipe(babel({'presets': ['es2015']}))
        .pipe(gulp.dest('dist')));

gulp.task('pre-test', () =>
    gulp.src([ 'src/**/*.js', 'src/**/*.jsx' ])
        .pipe(istanbul({instrumenter: isparta.Instrumenter}))
        .pipe(istanbul.hookRequire()));

gulp.task('test', ['pre-test'], () =>
    gulp.src([ 'spec/**/*.spec.js', 'spec/**/*.spec.jsx' ])
        .pipe(jasmine())
        .pipe(istanbul.writeReports()));
