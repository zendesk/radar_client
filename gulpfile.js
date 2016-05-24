var gulp = require('gulp')
var webpack = require('gulp-webpack')
var rename = require('gulp-rename')

gulp.task('default', function () {
  return gulp.src('lib/index.js')
    .pipe(webpack({
      output: {
        libraryTarget: 'var', // export global variable
        library: 'RadarClient'
      },
      externals: {
        minilog: 'Minilog',
        'engine.io-client': 'eio'
      },
      node: {
        setImmediate: false
      }
    }))
    .pipe(rename('radar_client.js'))
    .pipe(gulp.dest('dist/'))
})
