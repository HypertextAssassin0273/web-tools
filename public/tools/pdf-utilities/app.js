let currentFile = null; 
let currentPdfDoc = null;
let cropper = null;

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
  cropImg: document.getElementById('crop-image')
};

// --- CORE FUNCTIONS ---

function resetWorkspace() {
  if (cropper) cropper.destroy();
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

UI.btnExtract.addEventListener('click', async () => {
  const selectedCards = document.querySelectorAll('.page-card.selected');
  if (selectedCards.length === 0) return;

  const { PDFDocument } = PDFLib;
  
  // Create a disposable clone of the file to prevent detached ArrayBuffer crashes
  const pristineBlob = currentFile.slice(0, currentFile.size);
  const freshBuffer = await pristineBlob.arrayBuffer();
  
  const originalPdf = await PDFDocument.load(freshBuffer);
  const newPdf = await PDFDocument.create();

  const pageIndices = Array.from(selectedCards).map(card => parseInt(card.dataset.pageIndex));
  
  const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
  copiedPages.forEach(page => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'extracted-brochure.pdf');
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
