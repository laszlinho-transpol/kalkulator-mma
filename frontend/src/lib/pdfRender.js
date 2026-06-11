// Render PDF first page to a PNG data URL using pdfjs-dist (lazy-loaded).
export const pdfFileToPngDataUrl = async (file, maxWidth = 2000) => {
  // Lazy import keeps initial bundle smaller
  const pdfjs = await import("pdfjs-dist");
  // Use CDN worker that matches the installed version
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / baseViewport.width, 3);
  const viewport = page.getViewport({ scale });
  const cv = document.createElement("canvas");
  cv.width = viewport.width;
  cv.height = viewport.height;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvasContext: ctx, viewport, canvas: cv }).promise;
  return {
    dataUrl: cv.toDataURL("image/png"),
    width: cv.width,
    height: cv.height,
  };
};

export const imageFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ dataUrl: reader.result, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
