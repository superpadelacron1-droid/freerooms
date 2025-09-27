function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Export')
    .addItem('Esporta tabelle impilate (PDF)', 'showStackedTablesDialog')
    .addToUi();
}

function showStackedTablesDialog() {
  const sheets = ['Sheet1','Sheet2','Sheet3','Sheet4']; // lista fogli
  const html = buildHtmlForSheets(sheets);
  const output = HtmlService.createHtmlOutput(html)
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(output, 'Tabelle impilate');
}

function buildHtmlForSheets(sheetNames) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let html = '<!doctype html><html><head><meta charset="utf-8">';
  html += '<style>'
       + 'body{font-family:Arial,Helvetica,sans-serif;padding:18px;background:#fff;color:#111;margin:0}'
       + '.table-block{margin-bottom:30px;}'
       + 'table{border-collapse:collapse;table-layout:fixed;}'
       + 'td{padding:6px;border:1px solid #ccc;white-space:normal;word-wrap:break-word;}'
       + '#container{display:block;width:fit-content;height:auto;}'
       + '</style></head><body><div id="container">';

  sheetNames.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    const backgrounds = range.getBackgrounds();
    const fontColors = range.getFontColors();

    const startRow = range.getRow();
    const startCol = range.getColumn();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    const colWidths = [];
    let totalWidth = 0;
    for (let c = 0; c < numCols; c++) {
      const w = sheet.getColumnWidth(startCol + c);
      colWidths.push(w);
      totalWidth += w;
    }

    const rowHeights = [];
    for (let r = 0; r < numRows; r++) {
      try { rowHeights.push(sheet.getRowHeight(startRow + r)); }
      catch(e){ rowHeights.push(20); }
    }

    const skip = [];
    for (let r = 0; r < numRows; r++) { skip[r] = []; for (let c = 0; c < numCols; c++) skip[r][c] = false; }
    const mergedInfo = {};
    try {
      const mergedRanges = range.getMergedRanges();
      mergedRanges.forEach(function(m) {
        const msr = m.getRow() - startRow;
        const msc = m.getColumn() - startCol;
        const mr = m.getNumRows();
        const mc = m.getNumColumns();
        mergedInfo[msr + '_' + msc] = {rowspan: mr, colspan: mc};
        for (let r = msr; r < msr + mr; r++) {
          for (let c = msc; c < msc + mc; c++) {
            if (!(r === msr && c === msc)) skip[r][c] = true;
          }
        }
      });
    } catch(e) {}

    html += '<div class="table-block"><table style="width:' + totalWidth + 'px;">';
    html += '<colgroup>';
    for (let c = 0; c < numCols; c++) {
      html += '<col style="width:' + colWidths[c] + 'px">';
    }
    html += '</colgroup>';

    for (let r = 0; r < numRows; r++) {
      html += '<tr style="height:' + rowHeights[r] + 'px">';
      for (let c = 0; c < numCols; c++) {
        if (skip[r][c]) continue;
        const value = values[r][c] || '';
        const bg = (backgrounds && backgrounds[r] && backgrounds[r][c]) ? backgrounds[r][c] : '';
        const fc = (fontColors && fontColors[r] && fontColors[r][c]) ? fontColors[r][c] : '';
        let style = 'background:' + bg + ';color:' + fc + ';';
        html += '<td style="' + style + '">' + escapeHtml(value) + '</td>';
      }
      html += '</tr>';
    }

    html += '</table></div>';
  });

  html += '</div>'
       + '<div style="position:fixed;right:18px;top:8px;z-index:9999">'
       + '<button id="download" style="padding:8px 12px;border-radius:6px;border:0;background:#1976d2;color:#fff;cursor:pointer">Download PDF</button>'
       + '</div>';

  // includiamo html2canvas + jsPDF
  html += '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>';
  html += '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>';
  html += '<script>'
       + 'document.getElementById("download").addEventListener("click", function(){'
       + '  var el = document.getElementById("container");'
       + '  html2canvas(el,{scale:2,windowWidth:el.scrollWidth,windowHeight:el.scrollHeight}).then(function(canvas){'
       + '    const { jsPDF } = window.jspdf;'
       + '    const pdf = new jsPDF("p","pt","a4");'
       + '    var imgData = canvas.toDataURL("image/png");'
       + '    var pageWidth = pdf.internal.pageSize.getWidth();'
       + '    var pageHeight = pdf.internal.pageSize.getHeight();'
       + '    var imgWidth = pageWidth;'
       + '    var imgHeight = canvas.height * pageWidth / canvas.width;'
       + '    var position = 0;'
       + '    if(imgHeight < pageHeight){'
       + '      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);'
       + '    } else {'
       + '      while(position < canvas.height){'
       + '        var slice = canvas.getContext("2d").getImageData(0, position, canvas.width, pageHeight * canvas.width / pageWidth);'
       + '        var c = document.createElement("canvas");'
       + '        c.width = canvas.width;'
       + '        c.height = slice.height;'
       + '        c.getContext("2d").putImageData(slice, 0, 0);'
       + '        var sliceData = c.toDataURL("image/png");'
       + '        pdf.addImage(sliceData, "PNG", 0, 0, pageWidth, pageHeight);'
       + '        position += slice.height;'
       + '        if(position < canvas.height) pdf.addPage();'
       + '      }'
       + '    }'
       + '    pdf.save("tabelle_impilate.pdf");'
       + '  });'
       + '});'
       + '</script>';

  html += '</body></html>';
  return html;
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
