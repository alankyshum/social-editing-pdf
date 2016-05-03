/*
GLOBAL VARIABLES
 */
var xhttp = new XMLHttpRequest();
var domList = {
  file: {
    container: document.getElementById('file-explorer'),
    template: document.getElementById('file')
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
var loadPDF = (file, page) => {
  PDFJS.getDocument(file).then((pdf) => {
    pdf.getPage(page).then((page) => {
      var scale = 1;
      var viewport = page.getViewport(scale);

      var canvas = document.getElementById('pdf-viewer-canvas');
      var context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
    })
  })
}

// POPULATE FILE EXPLORER
var updateFileExplorer = () => {
  xhttp.open('get', '/api/filelist', true);
  xhttp.onreadystatechange = () => {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      var fileList = JSON.parse(xhttp.responseText);
      domList.file.container.innerHTML = "";
      fileList.forEach((file) => {
        var fileItem = domList.file.template.content.cloneNode(true);
        fileItem.querySelector('.filename').textContent = file.filename;
        fileItem.querySelector('img').src = "/file/"+file.thumbnail;
        domList.file.container.appendChild(fileItem);
      })
    }
  }
  xhttp.send();
}
updateFileExplorer();
