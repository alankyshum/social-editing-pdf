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
    bookmarkPage: null // page to be submitted to server
  },
  db: {
    bookmarkedPages: [] // for current PDF file
  }
}
var pdfInfo = {
  numPages: 0,
  currentPDF: ""
}

/*
SCRIPTS
 */
// SHOW MESSAGE LIKE ANDROID TOAST
var showMsg = (msg) => {
  domList.msgBox.container.textContent = msg;
  domList.msgBox.container.classList.add('fadeIn');
  setTimeout(() => {
    domList.msgBox.container.classList.remove('fadeIn');
  }, 5000);
}
var JSONtoURL = (json) => {
  return JSON.stringify(json).replace(/[{|}|"]/g, '').split(/:|,/).map((part, i) => {return i%2?"="+encodeURIComponent(part):encodeURIComponent(part);}).join('&').replace(/&=/g, '=');
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

  // RENDER SINGLE PAGE
  var renderPage = (page, canvasWrapper) => {
    var viewport = page.getViewport(options.scale);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (options.isThumbnail) {
      // thumbnail - related
      canvas.onclick = () => {
        domList.pdf.container.children[page.pageIndex].scrollIntoView()
      }
      canvasWrapper.appendChild(canvas);

      var bookmarkCnt = document.createElement('div');
      var studentCnt = bookmarkInfo.db.bookmarkedPages.student?bookmarkInfo.db.bookmarkedPages.student[page.pageIndex+1]:null
        , profCnt = bookmarkInfo.db.bookmarkedPages.prof?bookmarkInfo.db.bookmarkedPages.prof[page.pageIndex+1]:null;
      if (profCnt) bookmarkCnt.dataset.profCnt = profCnt;
      if (studentCnt) bookmarkCnt.dataset.studentCnt = studentCnt;
      bookmarkCnt.classList.add('bookmark-count');
      canvasWrapper.appendChild(bookmarkCnt);
    } else {
      // real pdf viewer
      canvasWrapper.appendChild(canvas);
      var bookmarkBtn = domList.bookmarkBtn.template.content.cloneNode(true);
      canvasWrapper.appendChild(bookmarkBtn);
      canvasWrapper.lastElementChild.setAttribute('onclick', `togglePageBookmark(${page.pageIndex+1});`);
    }

    page.render(renderContext);
  }

  // RENDER ALL PAGES
  var renderPages = (pdfDoc) => {
    pdfInfo.numPages = pdfDoc.numPages;
    canvasContainer.innerHTML = "";
    for(var num = 1; num <= pdfDoc.numPages; num++) {
      var _canvasDiv = document.createElement('div');
      _canvasDiv.classList.add('canvasWrapper');
      _canvasDiv.dataset.pageNum = num;
      canvasContainer.appendChild(_canvasDiv);

      pdfDoc.getPage(num).then((page) => {
        renderPage(page, canvasContainer.querySelector(`[data-page-num="${page.pageIndex+1}"]`))
      })
    }
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
  pdfInfo.currentPDF = e.dataset.file;
  domList.pdf.title.textContent = e.dataset.file;
  domList.thumbnail.container.innerHTML = "";
  getBookmarkedList().then((bookmarkList) => {
    bookmarkInfo.db.bookmarkedPages = bookmarkList;
    renderPDF("file/"+e.dataset.file, domList.pdf.container, {scale: 1, isThumbnail: false});
    renderPDF("file/"+e.dataset.file, domList.thumbnail.container, {scale: config.thumbnail.scale, isThumbnail: true});
  })
}


// BOOKMARK SYSTEM
var setUser = () => {
  var username = domList.demoPanel.container.querySelector('.input[name="username"]').value
    , role = domList.demoPanel.container.querySelector('.input[name="role"]').value;
  if (username && role) {
    var isSwitchUser = bookmarkInfo.user==username;
    bookmarkInfo.user = {
      username: username,
      role: role
    };
    isSwitchUser && showMsg(`Current User: ${username} set`);
    getBookmarkedList(null, username).then((bookmarkArray) => {
      // console.log(bookmarkArray);
      // clear existing bookmarks
      var existingBookedPages = domList.pdf.container.querySelectorAll('canvasWrapper.booked');
      Object.keys(existingBookedPages).forEach((pageIndex) => {
        existingBookedPages[pageIndex].classList.remove('booked');
      });
      // update bookmarks
      bookmarkArray.forEach((bookmarkIndex) => {
        domList.pdf.container.querySelector(`[data-page-num="${bookmarkIndex}"]`).classList.add('booked')
      })
    })
  }
}

var togglePageBookmark = (pageIndex) => {
  if (!bookmarkInfo.user.username) {
    showMsg("Set a user first");
    return;
  }
  pdfInfo.currentPDF = domList.pdf.title.textContent;
  bookmarkInfo.user.bookmarkPage = pageIndex;

  xhttp.open('post', '/api/setbookmark', true);
  xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      if (xhttp.responseText == "booked") {
        showMsg(`Page ${pageIndex} bookmarked`);
        domList.pdf.container.getElementsByClassName('canvasWrapper')[pageIndex-1].classList.add('booked');
      } else if (xhttp.responseText == "unbooked") {
        showMsg(`Page ${pageIndex} bookmark removed`);
        domList.pdf.container.getElementsByClassName('canvasWrapper')[pageIndex-1].classList.remove('booked');
      }
      // TODO: update global bookmark list

    }
  }
  xhttp.send(JSON.stringify({
    username: bookmarkInfo.user.username,
    role: bookmarkInfo.user.role,
    pdf: domList.pdf.title.textContent,
    pageNumber: pageIndex
  }));
}

var getBookmarkedList = (filename, username) => {
  filename = filename?filename:pdfInfo.currentPDF;
  return new Promise((resolve, reject) => {
    xhttp.open('post', '/api/getbookmarks', true);
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.onreadystatechange = () => {
      if (xhttp.readyState == 4 && xhttp.status == 200) {
        resolve(JSON.parse(xhttp.responseText));
      }
    }

    var requestJSON;
    if (username) {
      // get bookmark list from a user
      requestJSON = {
        username: username,
        filename: filename
      };
    } else {
      // get bookmark list from all users
      requestJSON = {
        filename: filename
      };
    }
    xhttp.send(JSON.stringify(requestJSON));
  }); //end:: promise
}


/**
 * -------------------
 * LISTENER ----------
 * -------------------
 */
domList.pdf.container.onscroll = (evt) => {
  domList.thumbnail.container.scrollTop = evt.srcElement.scrollTop*config.thumbnail.scale;
}
