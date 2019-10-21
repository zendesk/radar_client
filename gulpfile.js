var gulp = require('gulp')
var webpack = require('webpack-stream')
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
      },
      mode: 'development',
      devtool: 'inline-source-map'
    }))
    .pipe(rename('radar_client.js'))
    .pipe(gulp.dest('dist/'))
})
