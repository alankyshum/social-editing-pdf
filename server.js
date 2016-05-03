const express = require('express')
  , bodyParser = require('body-parser')
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
      if (filename != '.gitignore') {
        fs.unlink(filename);
      }
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
app.use(bodyParser.json());
app.use(express.static( path.join(__dirname, 'frontend')) );

// GET APIS
app.get('/file/:name', (req, res) => {
  if (req.params.name.match(/.pdf$/i)) {
    res.sendFile(path.join(__dirname, 'LFS', 'files', req.params.name));
  } else {
    res.sendFile(path.join(__dirname, 'LFS', 'thumbnails', req.params.name));
  }
});
app.get('/api/filelist', (req, res) => {
  var fileList = db.object.fileList.filter((filename) => {
    return filename != '.gitignore'
  }).map((filename) => {
    return {
      filename: filename,
      thumbnail: filename.match(/(.+).pdf$/i)[1]+".png"
    }
  })
  res.send(fileList);
});

// POST APIS
app.post('/api/bookmark', (req, res) => {
  var bookmarkInfo = {
    username: req.body.username,
    role: req.body.role,
    pdf: req.body.pdf,
    pageNumber: req.body.pageNumber
  };
  if (!bookmarkInfo.username) {
    res.sendStatus(500);
    return;
  }

  var _existingUser = db('users').find({
    username: bookmarkInfo.username
  });
  if (_existingUser) {
    if (!_existingUser.bookmark[bookmarkInfo.pdf]) _existingUser.bookmark[bookmarkInfo.pdf] = [];
    _existingUser.bookmark[bookmarkInfo.pdf].push(bookmarkInfo.pageNumber);
    db.write();
  } else {
    db('users').push({
      username: bookmarkInfo.username,
      role: bookmarkInfo.role,
      bookmark: {
        [bookmarkInfo.pdf]: [bookmarkInfo.pageNumber]
      }
    })
  }
  res.sendStatus(200);
});
app.post('/api/allbookmarks', (req, res) => {
  var filename = req.body.filename;
  var bookmarkCnt = {};
  db.object.users.forEach((user) => {
    user.bookmark[filename] && user.bookmark[filename].forEach((pageNum) => {
      if (!bookmarkCnt[user.role]) bookmarkCnt[user.role] = {};
      if (!bookmarkCnt[user.role][pageNum]) bookmarkCnt[user.role][pageNum] = 0;
      bookmarkCnt[user.role][pageNum]++;
    })
  })

  res.send(bookmarkCnt);
});


app.all('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
app.listen('3030', () => {
  console.log('Server Listening at port 3030');
});
