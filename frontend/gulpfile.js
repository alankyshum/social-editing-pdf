var gulp = require('gulp'),
    sass = require('gulp-sass');

gulp.task('build:scss', function () {
  return gulp.src('scss/**/*.scss')
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('css'));
});


gulp.task('watch', function () {
  gulp.watch('scss/**/*.scss', ['build:scss']);
});
