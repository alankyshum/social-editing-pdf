// __   ___   ___ ___   _   ___ _    ___ ___
// \ \ / /_\ | _ \_ _| /_\ | _ ) |  | __/ __|
//  \ V / _ \|   /| | / _ \| _ \ |__| _|\__ \
//   \_/_/ \_\_|_\___/_/ \_\___/____|___|___/
//
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
    bookmarkedPages: {} // for current PDF file
  }
}
var pdfInfo = {
  numPages: 0,
  currentPDF: ""
}
var ctrl = {
  helper: {},
  pdf: {},
  explorer: {},
  user: {},
  bookmark: {},
  thumbnail: {}
}



//  ___ _  _ ___ ___ ___ ___ _____ ___
// / __| \| |_ _| _ \ _ \ __|_   _/ __|
// \__ \ .` || ||  _/  _/ _|  | | \__ \
// |___/_|\_|___|_| |_| |___| |_| |___/
//
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


//  ___ ___ ___ ___ _____ ___
// / __| _ \_ _| _ \_   _/ __|
// \__ \   /| ||  _/ | | \__ \
// |___/_|_\___|_|   |_| |___/
//
// ====================================
// HELPER =============================
// ====================================
// SHOW MESSAGE LIKE ANDROID TOAST
ctrl.helper.showMsg = (msg) => {
  domList.msgBox.container.textContent = msg;
  domList.msgBox.container.classList.add('fadeIn');
  setTimeout(() => {
    domList.msgBox.container.classList.remove('fadeIn');
  }, 5000);
}
ctrl.helper.JSONtoURL = (json) => {
  return JSON.stringify(json).replace(/[{|}|"]/g, '').split(/:|,/).map((part, i) => {return i%2?"="+encodeURIComponent(part):encodeURIComponent(part);}).join('&').replace(/&=/g, '=');
}

// ====================================
// EXPLORER ===========================
// ====================================
// POPULATE FILE EXPLORER
ctrl.explorer.update = () => {
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
      ctrl.pdf.select(domList.file.container.children[0]);
    }
  }
  xhttp.send();
}
ctrl.explorer.update();


// ====================================
// USES ===============================
// ====================================
ctrl.user.set = () => {
  var username = domList.demoPanel.container.querySelector('.input[name="username"]').value
    , role = domList.demoPanel.container.querySelector('.input[name="role"]').value;
  if (username && role) {
    var isSwitchUser = bookmarkInfo.user.username!=username;
    bookmarkInfo.user = {
      username: username,
      role: role
    };
    domList.pdf.container.dataset.role = role; // for differentiated styling
    isSwitchUser && ctrl.helper.showMsg(`Current User: ${username} set`);
    ctrl.bookmark.getList(null, username).then((bookmarkArray) => {
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


// ====================================
// THUMBNAILS =========================
// ====================================
ctrl.thumbnail.updateBookmarks = (allBookmarks) => {
  bookmarkInfo.db.bookmarkedPages = allBookmarks;
  var canvasWrapperList = domList.thumbnail.container.querySelectorAll(`.canvasWrapper`);
  Object.keys(canvasWrapperList).forEach((elementKey, pageIndex) => {
    var cntDiv = canvasWrapperList[pageIndex].querySelector('.bookmark-count');
    ctrl.bookmark.updateDiv(pageIndex+1, cntDiv, allBookmarks);
  })
}


// ====================================
// PDF ================================
// ====================================
// SELECT PDF FROM FILE EXPLORER
ctrl.pdf.select = (e) => {
  var _activeItems = document.querySelector('#file-explorer .fileItem.active');
  _activeItems && _activeItems.classList.toggle('active');
  e.classList.toggle('active');
  pdfInfo.currentPDF = e.dataset.file;
  domList.pdf.title.textContent = e.dataset.file;
  domList.thumbnail.container.innerHTML = "";
  ctrl.bookmark.getList().then((bookmarkList) => {
    bookmarkInfo.db.bookmarkedPages = bookmarkList;
    ctrl.pdf.render("file/"+e.dataset.file, domList.pdf.container, {scale: 1, isThumbnail: false});
    ctrl.pdf.render("file/"+e.dataset.file, domList.thumbnail.container, {scale: config.thumbnail.scale, isThumbnail: true});
  })
}

ctrl.pdf.toggleBookmark = (pageIndex) => {
  if (!bookmarkInfo.user.username) {
    ctrl.helper.showMsg("Set a user first");
    return;
  }
  pdfInfo.currentPDF = domList.pdf.title.textContent;
  bookmarkInfo.user.bookmarkPage = pageIndex;

  xhttp.open('post', '/api/setbookmark', true);
  xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      if (xhttp.responseText == "booked") {
        ctrl.helper.showMsg(`Page ${pageIndex} bookmarked`);
        domList.pdf.container.getElementsByClassName('canvasWrapper')[pageIndex-1].classList.add('booked');
      } else if (xhttp.responseText == "unbooked") {
        ctrl.helper.showMsg(`Page ${pageIndex} bookmark removed`);
        domList.pdf.container.getElementsByClassName('canvasWrapper')[pageIndex-1].classList.remove('booked');
      }
      ctrl.bookmark.getList().then(ctrl.thumbnail.updateBookmarks);
    }
  }
  xhttp.send(JSON.stringify({
    username: bookmarkInfo.user.username,
    role: bookmarkInfo.user.role,
    pdf: domList.pdf.title.textContent,
    pageNumber: pageIndex
  }));
}

// LOAD PDF
ctrl.pdf.render = (url, canvasContainer, options) => {
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

      var bookmarkDiv = document.createElement('div');
      ctrl.bookmark.updateDiv(page.pageIndex+1, bookmarkDiv, bookmarkInfo.db.bookmarkedPages);
      bookmarkDiv.classList.add('bookmark-count');
      canvasWrapper.appendChild(bookmarkDiv);
    } else {
      // real pdf viewer
      canvasWrapper.appendChild(canvas);
      var bookmarkBtn = domList.bookmarkBtn.template.content.cloneNode(true);
      canvasWrapper.appendChild(bookmarkBtn);
      canvasWrapper.lastElementChild.setAttribute('onclick', `ctrl.pdf.toggleBookmark(${page.pageIndex+1});`);
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


// ====================================
// BOOKMARKS ==========================
// ====================================
ctrl.bookmark.getList = (filename, username) => {
  // no filename, auto set the current one
  // no username, get all bookmarks
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

ctrl.bookmark.updateDiv = (pageNum, bookmarkDiv, pageBookmarks) => {
  var studentCnt = pageBookmarks.student?pageBookmarks.student[pageNum]:null
    , profCnt = pageBookmarks.prof?pageBookmarks.prof[pageNum]:null;
  if (profCnt) {
    bookmarkDiv.dataset.profCnt = profCnt;
  } else {
    delete bookmarkDiv.dataset.profCnt;
  }
  if (studentCnt) {
    bookmarkDiv.dataset.studentCnt = studentCnt;
  } else {
    delete bookmarkDiv.dataset.studentCnt;
  }
}


//  _    ___ ___ _____ ___ _  _ ___ ___
// | |  |_ _/ __|_   _| __| \| | __| _ \
// | |__ | |\__ \ | | | _|| .` | _||   /
// |____|___|___/ |_| |___|_|\_|___|_|_\
//
domList.pdf.container.onscroll = (evt) => {
  domList.thumbnail.container.scrollTop = evt.srcElement.scrollTop*config.thumbnail.scale;
}
