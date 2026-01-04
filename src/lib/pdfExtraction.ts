/**
 * PDF Text Extraction Service
 * 
 * Extracts text from PDF files using pdfjs-dist (Mozilla's PDF.js library).
 * This is a client-side implementation that works in the browser.
 */

// Note: pdfjs-dist needs to be installed: pnpm add pdfjs-dist
// For TypeScript types: pnpm add -D @types/pdfjs-dist (if available)

/**
 * Extract text content from a PDF file
 * Returns the raw text content that can be parsed for transactions
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import to avoid loading pdfjs-dist if not needed
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source (required for pdfjs-dist)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    const textParts: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into a single string
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || '')
        .join(' ');
      
      textParts.push(pageText);
    }

    return textParts.join('\n\n');
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from an image file (for future OCR implementation)
 * For now, this is a placeholder that will be implemented in Phase 4
 */
export async function extractTextFromImage(_file: File): Promise<string> {
  // Placeholder for OCR implementation in Phase 4
  throw new Error('Image text extraction (OCR) not yet implemented. Please use PDF files for now.');
}

/**
 * Extract text from a file based on its MIME type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (file.type.startsWith('image/')) {
    return extractTextFromImage(file);
  } else {
    throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF or image file.`);
  }
}

