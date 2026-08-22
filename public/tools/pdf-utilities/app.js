let currentFileBuffer = null;
let currentPdfjsDoc = null;
let cropper = null;

const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');

// Handle File Upload
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  currentFileBuffer = arrayBuffer;
  currentPdfjsDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
  
  // Replaced inline block style with Tailwind class removal
  workspace.classList.remove('hidden'); 
  alert(`Loaded PDF with ${currentPdfjsDoc.numPages} pages.`);
});

// 1. Extract Sub-PDF
document.getElementById('btn-extract-pdf').addEventListener('click', async () => {
  let start = parseInt(document.getElementById('page-start').value);
  let end = parseInt(document.getElementById('page-end').value);
  let name = document.getElementById('pdf-name').value || 'sub-pdf';
  
  if (!start || !end || start > end) return alert("Invalid page range.");

  const { PDFDocument } = PDFLib;
  const originalDoc = await PDFDocument.load(currentFileBuffer);
  const newDoc = await PDFDocument.create();

  // PDF-lib uses 0-based index
  const pageIndices = Array.from({ length: (end - start) + 1 }, (_, i) => (start - 1) + i);
  const copiedPages = await newDoc.copyPages(originalDoc, pageIndices);
  
  copiedPages.forEach(page => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${name}.pdf`);
});

// 2. Load Page for Cropping
document.getElementById('btn-render').addEventListener('click', async () => {
  const pageNum = parseInt(document.getElementById('render-page').value);
  if (!pageNum || pageNum > currentPdfjsDoc.numPages) return alert("Invalid page number.");

  const page = await currentPdfjsDoc.getPage(pageNum);
  
  // Render at 2x scale for high-res thumbnails
  const viewport = page.getViewport({ scale: 2.0 }); 
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  const imgElement = document.getElementById('crop-image');
  imgElement.src = canvas.toDataURL('image/jpeg');
  
  // Adjusted visibility toggles for Tailwind compatibility
  document.getElementById('cropper-wrapper').classList.remove('hidden');
  const cropActions = document.getElementById('crop-actions');
  cropActions.classList.remove('hidden');
  cropActions.classList.add('flex');

  if (cropper) cropper.destroy();
  
  // Initialize Cropper.js allowing freeform selection
  cropper = new Cropper(imgElement, {
    viewMode: 1,
    autoCropArea: 0.5,
    background: false
  });
});

// 3. Export Thumbnail
document.getElementById('btn-export-img').addEventListener('click', () => {
  if (!cropper) return;
  const name = document.getElementById('img-name').value || 'thumbnail';
  
  // Output webp for better web performance
  cropper.getCroppedCanvas().toBlob((blob) => {
    downloadBlob(blob, `${name}.webp`);
  }, 'image/webp', 0.9);
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}