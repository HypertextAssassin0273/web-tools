let currentFile = null; 
let currentPdfDoc = null;
let cropper = null;
let splitCropper = null; // New cropper instance for PDF splitting

const UI = {
  uploadZone: document.getElementById('upload-zone'),
  fileInput: document.getElementById('file-input'),
  workspace: document.getElementById('workspace'),
  grid: document.getElementById('pages-grid'),
  toolbar: document.getElementById('toolbar'),
  btnExtract: document.getElementById('btn-extract'),
  btnCrop: document.getElementById('btn-crop'),
  btnSplit: document.getElementById('btn-split'), // New Split Button
  btnClear: document.getElementById('btn-clear'),
  btnReset: document.getElementById('btn-reset'),
  selCount: document.getElementById('selection-count'),
  
  cropModal: document.getElementById('crop-modal'),
  cropImg: document.getElementById('crop-image'),
  
  splitModal: document.getElementById('split-modal'),
  splitImg: document.getElementById('split-image')
};

// --- CORE FUNCTIONS ---

function resetWorkspace() {
  if (cropper) cropper.destroy();
  if (splitCropper) splitCropper.destroy();
  if (currentPdfDoc) currentPdfDoc.destroy();
  
  currentFile = null;
  currentPdfDoc = null;
  
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
  UI.btnSplit.disabled = selected.length !== 1; // Requires exactly 1 page
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- EVENT LISTENERS ---

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
    card.innerHTML = `<div class="page-label">Page ${i}</div>`;
    card.insertBefore(canvas, card.firstChild);
    
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

// --- 1. EXTRACT FULL PAGES ---
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
  copiedPages.forEach(page => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'extracted-pages.pdf');
});

// --- 2. SPLIT PDF PAGE (NEW FEATURE) ---
UI.btnSplit.addEventListener('click', async () => {
  const selected = document.querySelector('.page-card.selected');
  if (!selected) return;

  const pageNum = parseInt(selected.dataset.pageIndex) + 1;
  const page = await currentPdfDoc.getPage(pageNum);
  
  // Render high quality for visual selection
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
      // Force initial crop box to exactly the left 50% of the page
      const containerData = this.cropper.getContainerData();
      this.cropper.setCropBoxData({
        left: 0,
        top: 0,
        width: containerData.width / 2,
        height: containerData.height
      });
    },
    cropmove: function () {
      // Physically lock the crop box height to 100% so it can only slide horizontally
      const containerData = this.cropper.getContainerData();
      this.cropper.setCropBoxData({
        top: 0,
        height: containerData.height
      });
    }
  });
});

document.getElementById('btn-cancel-split').addEventListener('click', () => {
  UI.splitModal.style.display = 'none';
  if (splitCropper) splitCropper.destroy();
});

document.getElementById('btn-save-split').addEventListener('click', async () => {
  if (!splitCropper) return;

  // Get crop coordinates relative to the natural image
  const cropData = splitCropper.getData(true);
  const imageData = splitCropper.getImageData();

  // Calculate percentages (0.0 to 1.0) for where the crop starts and ends horizontally
  const ratioX = cropData.x / imageData.naturalWidth;
  const ratioW = cropData.width / imageData.naturalWidth;

  const selected = document.querySelector('.page-card.selected');
  const pageIndex = parseInt(selected.dataset.pageIndex);

  const { PDFDocument } = PDFLib;
  const pristineBlob = currentFile.slice(0, currentFile.size);
  const freshBuffer = await pristineBlob.arrayBuffer();

  const originalPdf = await PDFDocument.load(freshBuffer);
  const newPdf = await PDFDocument.create();

  // Copy only the single page we are splitting
  const [copiedPage] = await newPdf.copyPages(originalPdf, [pageIndex]);
  const { x: boxX, y: boxY, width, height } = copiedPage.getMediaBox();

  // Apply the horizontal slice to the PDF's native coordinates
  const cropX = boxX + (width * ratioX);
  const cropW = width * ratioW;
  
  // Set the new boundary in the PDF document
  copiedPage.setCropBox(cropX, boxY, cropW, height);
  newPdf.addPage(copiedPage);

  const pdfBytes = await newPdf.save();
  downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'split-page.pdf');

  UI.splitModal.style.display = 'none';
});

// --- 3. CROP THUMBNAIL IMAGE ---
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
