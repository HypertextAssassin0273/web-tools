let currentFile = null; 
let currentPdfDoc = null;
let cropper = null;
let splitCropper = null; 
let activeSplitCard = null;

const UI = {
  uploadZone: document.getElementById('upload-zone'),
  fileInput: document.getElementById('file-input'),
  workspace: document.getElementById('workspace'),
  grid: document.getElementById('pages-grid'),
  toolbar: document.getElementById('toolbar'),
  btnExtract: document.getElementById('btn-extract'),
  btnCrop: document.getElementById('btn-crop'),
  btnClear: document.getElementById('btn-clear'),
  btnReset: document.getElementById('btn-reset'),
  selCount: document.getElementById('selection-count'),
  
  cropModal: document.getElementById('crop-modal'),
  cropImg: document.getElementById('crop-image'),
  
  splitModal: document.getElementById('split-modal'),
  splitImg: document.getElementById('split-image')
};

function resetWorkspace() {
  if (cropper) cropper.destroy();
  if (splitCropper) splitCropper.destroy();
  if (currentPdfDoc) currentPdfDoc.destroy();
  
  currentFile = null;
  currentPdfDoc = null;
  activeSplitCard = null;
  
  UI.grid.innerHTML = '';
  UI.fileInput.value = ''; 
  
  UI.workspace.style.display = 'none';
  UI.toolbar.style.display = 'none';
  UI.uploadZone.style.display = 'block';
  updateToolbar();
}

function updateToolbar() {
  const selected = document.querySelectorAll('.page-card.selected');
  UI.selCount.textContent = `${selected.length} page(s) selected`;
  UI.btnExtract.disabled = selected.length === 0;
  UI.btnClear.disabled = selected.length === 0;
  UI.btnCrop.disabled = selected.length !== 1;
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

UI.btnReset.addEventListener('click', resetWorkspace);

UI.fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (currentPdfDoc) resetWorkspace();

  currentFile = file;

  UI.uploadZone.style.display = 'none';
  UI.workspace.style.display = 'block';
  UI.toolbar.style.display = 'flex';
  UI.grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Rendering pages...</p>';

  const fileUrl = URL.createObjectURL(file);
  currentPdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
  
  UI.grid.innerHTML = '';
  
  for (let i = 1; i <= currentPdfDoc.numPages; i++) {
    const page = await currentPdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 }); 
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport }).promise;

    const card = document.createElement('div');
    card.className = 'page-card';
    card.dataset.pageIndex = i - 1; 
    
    card.appendChild(canvas);
    
    const label = document.createElement('div');
    label.className = 'page-label';
    label.textContent = `Page ${i}`;
    card.appendChild(label);

    const splitBtn = document.createElement('button');
    splitBtn.className = 'split-btn';
    splitBtn.title = "Split this page";
    splitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>';
    
    splitBtn.addEventListener('click', async (btnEvent) => {
      btnEvent.stopPropagation();
      await openSplitModal(card);
    });
    
    card.appendChild(splitBtn);
    
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      updateToolbar();
    });

    UI.grid.appendChild(card);
  }

  new Sortable(UI.grid, { animation: 150 });
});

UI.btnClear.addEventListener('click', () => {
  document.querySelectorAll('.page-card.selected').forEach(card => card.classList.remove('selected'));
  updateToolbar();
});

UI.btnExtract.addEventListener('click', async () => {
  const selectedCards = document.querySelectorAll('.page-card.selected');
  if (selectedCards.length === 0) return;

  const { PDFDocument } = PDFLib;
  const pristineBlob = currentFile.slice(0, currentFile.size);
  const freshBuffer = await pristineBlob.arrayBuffer();
  
  const originalPdf = await PDFDocument.load(freshBuffer);
  const newPdf = await PDFDocument.create();

  const pageIndices = Array.from(selectedCards).map(card => parseInt(card.dataset.pageIndex));
  
  const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
  
  selectedCards.forEach((card, idx) => {
    const copiedPage = copiedPages[idx];
    
    if (card.dataset.cropRatioX && card.dataset.cropRatioW) {
      const ratioX = parseFloat(card.dataset.cropRatioX);
      const ratioW = parseFloat(card.dataset.cropRatioW);
      const ratioY = parseFloat(card.dataset.cropRatioY || 0);
      const ratioH = parseFloat(card.dataset.cropRatioH || 1);
      
      const { x: boxX, y: boxY, width, height } = copiedPage.getMediaBox();
      
      const cropX = boxX + (width * ratioX);
      const cropW = width * ratioW;
      const cropY = boxY + (height * (1 - ratioY - ratioH));
      const cropH = height * ratioH;
      
      copiedPage.setCropBox(cropX, cropY, cropW, cropH);
    }
    
    newPdf.addPage(copiedPage);
  });

  const pdfBytes = await newPdf.save();
  downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'extracted-brochure.pdf');
});

async function openSplitModal(card) {
  activeSplitCard = card;
  const pageNum = parseInt(card.dataset.pageIndex) + 1;
  const page = await currentPdfDoc.getPage(pageNum);
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  UI.splitImg.src = canvas.toDataURL('image/jpeg');
  UI.splitModal.style.display = 'flex';

  if (splitCropper) splitCropper.destroy();
  
  splitCropper = new Cropper(UI.splitImg, {
    viewMode: 1,
    background: false,
    zoomable: false,
    ready: function () {
      if (card.dataset.cropRatioX) {
         // Accurately restore exact state using natural image coordinates
         const imageData = this.cropper.getImageData();
         this.cropper.setData({
            x: imageData.naturalWidth * parseFloat(card.dataset.cropRatioX),
            y: imageData.naturalHeight * parseFloat(card.dataset.cropRatioY),
            width: imageData.naturalWidth * parseFloat(card.dataset.cropRatioW),
            height: imageData.naturalHeight * parseFloat(card.dataset.cropRatioH)
         });
      } else {
         // Default to 50% left horizontal split
         const containerData = this.cropper.getContainerData();
         this.cropper.setCropBoxData({
           left: 0,
           top: 0,
           width: containerData.width / 2,
           height: containerData.height
         });
      }
    }
  });
}

document.getElementById('btn-cancel-split').addEventListener('click', () => {
  UI.splitModal.style.display = 'none';
  if (splitCropper) splitCropper.destroy();
  activeSplitCard = null;
});

document.getElementById('btn-save-split').addEventListener('click', async () => {
  if (!splitCropper || !activeSplitCard) return;

  const cropData = splitCropper.getData(true);
  const imageData = splitCropper.getImageData();

  const ratioX = cropData.x / imageData.naturalWidth;
  const ratioW = cropData.width / imageData.naturalWidth;
  const ratioY = cropData.y / imageData.naturalHeight;
  const ratioH = cropData.height / imageData.naturalHeight;

  activeSplitCard.dataset.cropRatioX = ratioX;
  activeSplitCard.dataset.cropRatioW = ratioW;
  activeSplitCard.dataset.cropRatioY = ratioY;
  activeSplitCard.dataset.cropRatioH = ratioH;

  const pageNum = parseInt(activeSplitCard.dataset.pageIndex) + 1;
  const page = await currentPdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 0.5 });
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = viewport.width;
  tempCanvas.height = viewport.height;
  await page.render({ canvasContext: tempCanvas.getContext('2d'), viewport }).promise;

  const cardCanvas = activeSplitCard.querySelector('canvas');
  cardCanvas.width = viewport.width * ratioW;
  cardCanvas.height = viewport.height * ratioH;
  
  cardCanvas.getContext('2d').drawImage(
    tempCanvas,
    viewport.width * ratioX, viewport.height * ratioY, viewport.width * ratioW, viewport.height * ratioH,
    0, 0, cardCanvas.width, cardCanvas.height
  );

  UI.splitModal.style.display = 'none';
  activeSplitCard = null;
});

UI.btnCrop.addEventListener('click', async () => {
  const selected = document.querySelector('.page-card.selected');
  if (!selected) return;

  const pageNum = parseInt(selected.dataset.pageIndex) + 1;
  const page = await currentPdfDoc.getPage(pageNum);
  
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  UI.cropImg.src = canvas.toDataURL('image/jpeg');
  UI.cropModal.style.display = 'flex';

  if (cropper) cropper.destroy();
  cropper = new Cropper(UI.cropImg, {
    viewMode: 1,
    autoCropArea: 0.6,
    background: false,
    zoomable: false 
  });
});

document.getElementById('btn-cancel-crop').addEventListener('click', () => {
  UI.cropModal.style.display = 'none';
  if (cropper) cropper.destroy();
});

document.getElementById('btn-save-crop').addEventListener('click', () => {
  if (!cropper) return;
  cropper.getCroppedCanvas().toBlob((blob) => {
    downloadFile(blob, 'thumbnail.webp');
    UI.cropModal.style.display = 'none';
  }, 'image/webp', 0.9);
});
