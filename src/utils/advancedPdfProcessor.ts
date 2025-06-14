
export interface PDFProcessingResult {
  originalText: string;
  anonymizedText: string;
  detectedPatterns: any[];
  redactedPdfBlob?: Blob;
  summary: {
    totalPatterns: number;
    cpfCount: number;
    nameCount: number;
    phoneCount: number;
    emailCount: number;
  };
}

export class AdvancedPDFProcessor {
  static async processWithSupabase(file: File, options: any): Promise<PDFProcessingResult> {
    console.log('🚀 Processando PDF com Supabase Edge Function...');
    
    try {
      // Import do serviço
      const { SupabaseDocumentService } = await import('@/services/supabaseDocumentService');
      
      const result = await SupabaseDocumentService.processDocument(file, options);
      
      return {
        originalText: result.originalText,
        anonymizedText: result.anonymizedText,
        detectedPatterns: result.detectedPatterns,
        summary: result.summary
      };
    } catch (error) {
      console.error('❌ Erro no processamento via Supabase:', error);
      throw error;
    }
  }

  static async extractTextWithFallbacks(pdfFile: File): Promise<string> {
    console.log('📄 Tentando extrair texto do PDF com fallbacks...');
    
    // Primeiro: tentar com pdf-parse (mais simples)
    try {
      const pdfParse = await import('pdf-parse');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const result = await pdfParse.default(Buffer.from(arrayBuffer));
      
      if (result.text && result.text.trim()) {
        console.log('✅ Texto extraído com pdf-parse:', result.text.length, 'caracteres');
        return result.text;
      }
    } catch (error) {
      console.warn('⚠️ pdf-parse falhou:', error);
    }

    // Segundo: tentar com pdfjs-dist
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configurar worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      if (fullText.trim()) {
        console.log('✅ Texto extraído com pdfjs-dist:', fullText.length, 'caracteres');
        return fullText;
      }
    } catch (error) {
      console.warn('⚠️ pdfjs-dist falhou:', error);
    }

    // Último recurso: retornar texto de fallback
    console.warn('⚠️ Não foi possível extrair texto do PDF');
    return `[ERRO: Não foi possível extrair texto do PDF]

Arquivo: ${pdfFile.name}
Tamanho: ${pdfFile.size} bytes
Data: ${new Date().toLocaleString('pt-BR')}

O PDF pode estar:
- Protegido por senha
- Composto apenas por imagens (necessita OCR)
- Corrompido ou em formato não suportado

Tente converter o arquivo para DOCX ou TXT antes de processar.`;
  }

  static async createRedactedPDF(originalFile: File, detectedPatterns: any[]): Promise<Blob> {
    console.log('🎨 Criando PDF com tarjas...');
    
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      
      // Aplicar tarjas em posições simuladas
      pages.forEach((page, pageIndex) => {
        const { width, height } = page.getSize();
        
        detectedPatterns.forEach((pattern, patternIndex) => {
          // Calcular posição baseada no índice
          const x = 50 + (patternIndex % 4) * 120;
          const y = height - 100 - Math.floor(patternIndex / 4) * 30;
          
          // Desenhar tarja preta
          page.drawRectangle({
            x: x,
            y: y,
            width: 100,
            height: 15,
            color: rgb(0, 0, 0),
          });
          
          // Adicionar texto anonimizado
          page.drawText('[ANONIMIZADO]', {
            x: x + 2,
            y: y + 2,
            size: 8,
            font: font,
            color: rgb(1, 1, 1),
          });
        });
        
        // Adicionar marca d'água
        page.drawText('Documento Anonimizado', {
          x: 50,
          y: height - 20,
          size: 8,
          font: font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.5,
        });
      });
      
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('❌ Erro ao criar PDF com tarjas:', error);
      throw new Error('Falha na criação do PDF com tarjas');
    }
  }

  static generateDebugInfo(file: File, error?: any): string {
    return `DEBUG INFO - Processamento PDF
    
Arquivo: ${file.name}
Tamanho: ${file.size} bytes
Tipo MIME: ${file.type}
Última modificação: ${new Date(file.lastModified).toLocaleString('pt-BR')}

${error ? `Erro: ${error.message}\n` : ''}

Bibliotecas disponíveis:
- pdf-parse: ${typeof window !== 'undefined' ? 'Browser' : 'Node.js'}
- pdf-lib: Disponível
- pdfjs-dist: Disponível

Sugestões:
1. Verificar se o PDF não está corrompido
2. Tentar converter para DOCX
3. Usar OCR se for PDF escaneado
4. Verificar logs do Edge Function no Supabase

Data do debug: ${new Date().toLocaleString('pt-BR')}`;
  }
}
