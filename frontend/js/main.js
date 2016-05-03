/*
GLOBAL VARIABLES
 */
var xhttp = new XMLHttpRequest();
var domList = {
  file: {
    container: document.getElementById('file-container'),
    template: document.getElementById('file')
  },
  pdf: {
    container: document.getElementById('pdf-container'),
    title: document.querySelector('#pdf-viewer .file-header')
  }
}

/*
SCRIPTS
 */
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
  domList.pdf.container.innerHTML = "";

  var renderPage = (page) => {
    var viewport = page.getViewport(options.scale);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvasContainer.appendChild(canvas);

    page.render(renderContext);
  }

  var renderPages = (pdfDoc) => {
    for(var num = 1; num <= pdfDoc.numPages; num++)
      pdfDoc.getPage(num).then(renderPage);
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

  renderPDF("file/"+e.dataset.file, domList.pdf.container);
}
