
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
  static async extractTextWithCoordinates(pdfFile: File): Promise<PDFTextItem[]> {
    try {
      // Importar pdfjs-dist dinamicamente
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configurar worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const allItems: PDFTextItem[] = [];
      
      // Processar cada página
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            // Calcular posição real no PDF
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5]; // Inverter Y para PDF coordinate system
            
            allItems.push({
              text: item.str,
              x: x,
              y: y,
              width: item.width || 0,
              height: item.height || 12, // Altura padrão
              pageNumber: pageNum
            });
          }
        });
      }
      
      console.log(`📄 PDF processado: ${pdf.numPages} páginas, ${allItems.length} itens de texto`);
      return allItems;
    } catch (error) {
      console.error('❌ Erro ao extrair texto com coordenadas:', error);
      throw new Error('Falha na extração de texto com coordenadas do PDF');
    }
  }
  
  static mapSensitiveDataToCoordinates(
    textItems: PDFTextItem[], 
    detectedPatterns: any[]
  ): SensitiveMatch[] {
    const matches: SensitiveMatch[] = [];
    
    detectedPatterns.forEach(pattern => {
      const matchingItems: PDFTextItem[] = [];
      
      // Procurar itens de texto que contenham o padrão detectado
      const patternWords = pattern.value.split(/\s+/);
      
      textItems.forEach((item, index) => {
        // Verificar se este item contém parte do padrão
        const itemText = item.text.trim();
        
        if (patternWords.some(word => itemText.includes(word)) || itemText.includes(pattern.value)) {
          matchingItems.push(item);
        }
        
        // Para CPFs e outros padrões formatados, verificar match direto
        if (item.text.includes(pattern.value)) {
          matchingItems.push(item);
        }
      });
      
      if (matchingItems.length > 0) {
        matches.push({
          originalText: pattern.value,
          anonymizedText: '', // Será preenchido durante anonimização
          items: matchingItems
        });
      }
    });
    
    console.log(`🎯 Mapeamento concluído: ${matches.length} dados sensíveis mapeados para coordenadas`);
    return matches;
  }
  
  static async applyRedactionsToPDF(
    originalFile: File, 
    matches: SensitiveMatch[]
  ): Promise<Blob> {
    try {
      // Importar pdf-lib dinamicamente
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      console.log(`🎨 Aplicando tarjas em ${matches.length} localizações...`);
      
      matches.forEach(match => {
        match.items.forEach(item => {
          const page = pdfDoc.getPage(item.pageNumber - 1); // PDF pages são 0-indexed
          
          // Calcular área da tarja com margem
          const padding = 2;
          const rectX = Math.max(0, item.x - padding);
          const rectY = Math.max(0, item.y - padding);
          const rectWidth = item.width + (padding * 2);
          const rectHeight = item.height + (padding * 2);
          
          // Desenhar tarja preta
          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: rgb(0, 0, 0), // Preto
            opacity: 1.0
          });
          
          // Opcionalmente, desenhar texto anonimizado sobre a tarja
          if (match.anonymizedText && match.anonymizedText !== match.originalText) {
            page.drawText(match.anonymizedText, {
              x: rectX + 2,
              y: rectY + 2,
              size: Math.min(10, item.height - 2),
              font: font,
              color: rgb(1, 1, 1) // Branco
            });
          }
          
          console.log(`🔨 Tarja aplicada: "${item.text}" na página ${item.pageNumber}`);
        });
      });
      
      // Adicionar marca d'água discreta
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
      
      console.log('✅ PDF com tarjas gerado com sucesso');
      return blob;
    } catch (error) {
      console.error('❌ Erro ao aplicar tarjas no PDF:', error);
      throw new Error('Falha na aplicação de tarjas no PDF');
    }
  }
}
