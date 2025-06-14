
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { DetectedPattern } from './patternDetection';

// Configure worker for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.js`;

export interface PDFTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface SensitiveMatch {
  originalText: string;
  anonymizedText: string;
  items: PDFTextItem[];
}

export class PDFProcessor {
  /**
   * Extract text with coordinates from PDF file
   */
  static async extractTextWithCoordinates(pdfFile: File): Promise<PDFTextItem[]> {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const allItems: PDFTextItem[] = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            // Calculate real position in PDF
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5]; // Invert Y for PDF coordinate system
            
            allItems.push({
              text: item.str,
              x: x,
              y: y,
              width: item.width || 0,
              height: item.height || 12, // Default height
              pageNumber: pageNum
            });
          }
        });
      }
      
      console.log(`📄 PDF processed: ${pdf.numPages} pages, ${allItems.length} text items`);
      return allItems;
    } catch (error) {
      console.error('❌ Error extracting text with coordinates:', error);
      throw new Error('Failed to extract text with coordinates from PDF');
    }
  }
  
  /**
   * Map detected patterns to PDF coordinates
   */
  static mapSensitiveDataToCoordinates(
    textItems: PDFTextItem[], 
    detectedPatterns: DetectedPattern[]
  ): SensitiveMatch[] {
    const matches: SensitiveMatch[] = [];
    
    detectedPatterns.forEach(pattern => {
      const matchingItems: PDFTextItem[] = [];
      
      // Look for text items that contain the detected pattern
      const patternWords = pattern.value.split(/\s+/);
      
      textItems.forEach((item) => {
        // Check if this item contains part of the pattern
        const itemText = item.text.trim();
        
        if (patternWords.some(word => itemText.includes(word)) || itemText.includes(pattern.value)) {
          matchingItems.push(item);
        }
        
        // For CPFs and other formatted patterns, check direct match
        if (item.text.includes(pattern.value)) {
          matchingItems.push(item);
        }
      });
      
      if (matchingItems.length > 0) {
        matches.push({
          originalText: pattern.value,
          anonymizedText: `[${pattern.type.toUpperCase()}_ANONIMIZADO]`,
          items: matchingItems
        });
      }
    });
    
    console.log(`🎯 Mapping completed: ${matches.length} sensitive data mapped to coordinates`);
    return matches;
  }
  
  /**
   * Apply redactions to PDF using black rectangles
   */
  static async applyRedactionsToPDF(
    originalFile: File, 
    matches: SensitiveMatch[]
  ): Promise<Blob> {
    try {
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      console.log(`🎨 Applying redactions at ${matches.length} locations...`);
      
      matches.forEach(match => {
        match.items.forEach(item => {
          const page = pdfDoc.getPage(item.pageNumber - 1); // PDF pages are 0-indexed
          
          // Calculate redaction area with padding
          const padding = 2;
          const rectX = Math.max(0, item.x - padding);
          const rectY = Math.max(0, item.y - padding);
          const rectWidth = item.width + (padding * 2);
          const rectHeight = item.height + (padding * 2);
          
          // Draw black rectangle
          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: rgb(0, 0, 0), // Black
            opacity: 1.0
          });
          
          console.log(`🔨 Redaction applied: "${item.text}" on page ${item.pageNumber}`);
        });
      });
      
      // Add discrete watermark
      const totalPages = pdfDoc.getPageCount();
      for (let i = 0; i < totalPages; i++) {
        const page = pdfDoc.getPage(i);
        const { height } = page.getSize();
        
        page.drawText('Documento anonimizado', {
          x: 50,
          y: height - 20,
          size: 8,
          font: font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.5
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      console.log('✅ PDF with redactions generated successfully');
      return blob;
    } catch (error) {
      console.error('❌ Error applying redactions to PDF:', error);
      throw new Error('Failed to apply redactions to PDF');
    }
  }

  /**
   * Extract text from PDF (simple text extraction)
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => (item as TextItem).str).join(" ");
        fullText += pageText + "\n";
      }

      return fullText;
    } catch (error) {
      console.error('❌ Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }
}
