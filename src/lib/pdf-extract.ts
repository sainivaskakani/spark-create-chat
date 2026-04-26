// Lightweight PDF text extraction using pdfjs-dist (browser-side).
// Lazy-loaded so the main bundle stays slim.

export async function extractPdfText(file: File, maxChars = 60_000): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // Use a CDN worker to avoid bundler config gymnastics
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out += `\n\n--- Page ${i} ---\n${text}`;
    if (out.length > maxChars) {
      out = out.slice(0, maxChars) + "\n\n…[truncated]";
      break;
    }
  }
  return out.trim();
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
