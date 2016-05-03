/*
GLOBAL VARIABLES
 */
var xhttp = new XMLHttpRequest();
var domList = {
  file: {
    container: document.getElementById('file-container'),
    template: document.getElementById('file-template')
  },
  thumbnail: {
    container: document.getElementById('thumbnails-container'),
    title: document.querySelector('#thumbnails-container .file-header')
  },
  pdf: {
    container: document.getElementById('pdf-container'),
    title: document.querySelector('#pdf-viewer .file-header')
  },
  demoPanel: {
    container: document.getElementById('demoPanel')
  },
  msgBox: {
    container: document.getElementById('msg')
  },
  bookmarkBtn: {
    template: document.getElementById('bookmarkBtn-template')
  }
}
var config = {
  thumbnail: {
    scale: 0.2
  }
}
var bookmarkInfo = {
  user: {
    username: null, // identified for the current user
    role: null, // students, or professor
    currentPDF: null,
    bookmarkPage: null // page to be submitted to server
  },
  db: {
    bookmarkedPages: [] // for current PDF file
  }
}

/*
SCRIPTS
 */
// HELPER FUNCTIONS
var showMsg = (msg) => {
  domList.msgBox.container.textContent = msg;
  domList.msgBox.container.classList.add('fadeIn');
  setTimeout(() => {
    domList.msgBox.container.classList.remove('fadeIn');
  }, 5000);
}


// CROSS-BROWSER SUPPORT
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (function() {
  return window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback, element) {
      window.setTimeout(callback, 1000 / 60);
    };
  })();
}

// LOAD PDF
var renderPDF = (url, canvasContainer, options) => {
  var options = options || { scale: 1 };
  canvasContainer.innerHTML = "";

  var renderPage = (page) => {
    var viewport = page.getViewport(options.scale);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    var canvasWrapper = document.createElement('div');
    canvasWrapper.classList.add('canvasWrapper');

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    if (options.isThumbnail) {
      canvas.onclick = () => {
        domList.pdf.container.children[page.pageIndex].scrollIntoView()
      }
    }
    canvasWrapper.appendChild(canvas);
    if (!options.isThumbnail) {
      var bookmarkBtn = domList.bookmarkBtn.template.content.cloneNode(true);
      canvasWrapper.appendChild(bookmarkBtn);
      canvasWrapper.lastElementChild.onclick = () => {
        bookmarkThisPage(page.pageIndex+1);
      }
    }
    canvasContainer.appendChild(canvasWrapper);

    page.render(renderContext);
  }

  var renderPages = (pdfDoc) => {
    for(var num = 1; num <= pdfDoc.numPages; num++)
      pdfDoc.getPage(num).then((page) => {
        renderPage(page);
      });
  }
  // PDFJS.disableWorker = true;
  PDFJS.getDocument(url).then(renderPages);
}

// POPULATE FILE EXPLORER
var updateFileExplorer = () => {
  xhttp.open('get', '/api/filelist', true);
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      var fileList = JSON.parse(xhttp.responseText);
      fileList.forEach((file) => {
        var fileItem = domList.file.template.content.cloneNode(true);
        fileItem.querySelector('.filename').textContent = file.filename;
        fileItem.querySelector('img').src = "/file/"+file.thumbnail;
        domList.file.container.appendChild(fileItem);
        domList.file.container.lastElementChild.dataset.file = file.filename;
      })
      // load PDF
      selectPDF(domList.file.container.children[0]);
    }
  }
  xhttp.send();
}
updateFileExplorer();


// SELECT PDF FROM FILE EXPLORER
var selectPDF = (e) => {
  var _activeItems = document.querySelector('#file-explorer .fileItem.active');
  _activeItems && _activeItems.classList.toggle('active');
  e.classList.toggle('active');
  domList.pdf.title.textContent = e.dataset.file;

  renderPDF("file/"+e.dataset.file, domList.pdf.container, {scale: 1, isThumbnail: false});
  renderPDF("file/"+e.dataset.file, domList.thumbnail.container, {scale: config.thumbnail.scale, isThumbnail: true});

  domList.pdf.container.onscroll = (evt) => {
    domList.thumbnail.container.scrollTop = evt.srcElement.scrollTop*config.thumbnail.scale;
  }
}


// BOOKMARK SYSTEM
var setUser = () => {
  var username = domList.demoPanel.container.querySelector('.input[name="username"]').value
    , role = domList.demoPanel.container.querySelector('.input[name="role"]').value;
  bookmarkInfo.user = {
    username: username,
    role: role
  };
  showMsg(`Current User: ${username} set`)
}
var bookmarkThisPage = (pageIndex) => {
  console.log(pageIndex);
  showMsg(`Page ${pageIndex} bookmarked :)`)
}
