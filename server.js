const express = require('express')
  , path = require('path')
  , fs = require('fs')
  , colors = require('colors')
  , low = require('lowdb')
  , storage = require('lowdb/file-sync')
  , pdf2png = require('pdf2png');

const db = low('db.json', {storage});

/**
 * -----------------
 * ROUTINE FUNCTIONS
 * -----------------
 */
var thumbnail = (() => {
  var returnFx = {};

  returnFx.build = (filename) => {
    var _pdfFileName = filename.match(/(.+).pdf$/i)[1];
    var _pdfFilePath = path.join(__dirname, 'LFS', 'files', filename).replace(/ /g, '\\ ')
      , _thumbnailPath = path.join(__dirname, 'LFS', 'thumbnails', _pdfFileName+".png");
    pdf2png.convert(_pdfFilePath, {quality: 50}, (resp) => {
      if( !resp.success) {
        console.error(`${JSON.stringify(resp)}`.red);
        console.error(`${filename} retrival error`.red); return;
      }
      fs.writeFile(_thumbnailPath, resp.data, function(err) {
        if(err) { console.error(err); }
        else { console.log(`[${filename}] has thumbnnail saved`) };
      });
    });
  }

  returnFx.cleanUp = (thumbnailPathList) => {
    thumbnailPathList.forEach((filename) => {
      fs.unlink(filename);
    })
  }

  returnFx.update = () => {
    fs.readdir(path.join(__dirname, 'LFS', 'files'), (err, files) => {
      var _sameFileList = (db.object.fileList && db.object.fileList.length == files.length
        && db.object.fileList.every((filename, index) => {
          return filename === files[index]
        })
      )
      if (!_sameFileList) {
        db.object.fileList = files;
        db.write();
        var _thumbnailList = fs.readdirSync(path.join(__dirname, 'LFS', 'thumbnails')).map((filename) => {
          return path.join(__dirname, 'LFS', 'thumbnails', filename)
        })
        returnFx.cleanUp(_thumbnailList);
        files.forEach((filename) => {
          if (filename.match(/.pdf$/i))
          returnFx.build(filename);
        })
      }
    })
  }

  return returnFx;

})();

thumbnail.update();

fs.watch(path.join(__dirname, 'LFS', 'files'), {
  recursive: true
}, (evt, filename) => {
  if (~filename.indexOf(' ')) {
    // resource busy, auto lock and release
    var _folderPath = path.join(__dirname, 'LFS', 'files');
    fs.rename(
      path.join(_folderPath, filename), path.join(_folderPath, filename.replace(/ /g, '_')), (err) => {
        if (err) console.error(`${err}`.red);
    })
  }
  thumbnail.update();
})

/**
 * -------------------------
 * EXPRESS :: SEVRER ROUTING
 * -------------------------
 */

var app = express();

app.use(express.static( path.join(__dirname, 'frontend')) );
app.get('/file/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'LFS', req.params.name));
});

app.all('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})

app.listen('3030', () => {
  console.log('Server Listening at port 3030');
})
