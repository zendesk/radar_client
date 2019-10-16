var gulp = require('gulp')
var webpack = require('webpack-stream')
var rename = require('gulp-rename')

gulp.task('default', function () {
  return gulp.src('lib/index.js')
    .pipe(webpack({
      mode: 'development',
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
