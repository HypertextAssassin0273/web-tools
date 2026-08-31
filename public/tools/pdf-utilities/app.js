let currentFileBuffer = null;
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
  selCount: document.getElementById('selection-count'),
  cropModal: document.getElementById('crop-modal'),
  cropImg: document.getElementById('crop-image')
};

// 1. Handle Upload
UI.fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  UI.uploadZone.style.display = 'none';
  UI.workspace.style.display = 'block';
  UI.toolbar.style.display = 'flex';
  UI.grid.innerHTML = '<p>Rendering pages...</p>';

  currentFileBuffer = await file.arrayBuffer();
  currentPdfDoc = await pdfjsLib.getDocument(currentFileBuffer).promise;
  
  UI.grid.innerHTML = '';
  
  // Render thumbnails
  for (let i = 1; i <= currentPdfDoc.numPages; i++) {
    const page = await currentPdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 }); // Low res for grid
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport }).promise;

    const card = document.createElement('div');
    card.className = 'page-card';
    card.dataset.pageIndex = i - 1; // 0-based for pdf-lib
    card.innerHTML = `<div class="page-label">Page ${i}</div>`;
    card.insertBefore(canvas, card.firstChild);
    
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      updateToolbar();
    });

    UI.grid.appendChild(card);
  }

  // Initialize Drag & Drop Sorting
  new Sortable(UI.grid, { animation: 150 });
});

function updateToolbar() {
  const selected = document.querySelectorAll('.page-card.selected');
  UI.selCount.textContent = `${selected.length} page(s) selected`;
  UI.btnExtract.disabled = selected.length === 0;
  UI.btnCrop.disabled = selected.length !== 1; // Crop requires exactly 1 page
}

// 2. Extract Sub-PDF
UI.btnExtract.addEventListener('click', async () => {
  const selectedCards = document.querySelectorAll('.page-card.selected');
  if (selectedCards.length === 0) return;

  const { PDFDocument } = PDFLib;
  const originalPdf = await PDFDocument.load(currentFileBuffer);
  const newPdf = await PDFDocument.create();

  // SortableJS physically moves DOM nodes, so iterating the DOM gives the correct new order!
  const pageIndices = Array.from(selectedCards).map(card => parseInt(card.dataset.pageIndex));
  
  const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
  copiedPages.forEach(page => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'extracted-brochure.pdf');
});

// 3. Open Crop Modal
UI.btnCrop.addEventListener('click', async () => {
  const selected = document.querySelector('.page-card.selected');
  if (!selected) return;

  const pageNum = parseInt(selected.dataset.pageIndex) + 1;
  const page = await currentPdfDoc.getPage(pageNum);
  
  // Render at 2.5x scale for high-res cropping
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
    zoomable: false // Prevents mouse wheel scrolling issues
  });
});

// 4. Crop Actions
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

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}