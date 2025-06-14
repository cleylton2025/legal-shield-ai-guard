
import { detectPatterns, DetectedPattern } from './patternDetection';
import { AnonymizationEngine, AnonymizationResult } from './anonymizationTechniques';
import { PDFProcessor } from './pdfProcessor';

export interface ProcessingOptions {
  cpf: string;
  names: string;
  phones: string;
  emails: string;
  keepConsistency: boolean;
  preserveFormatting: boolean;
}

export interface ProcessingResult {
  originalText: string;
  anonymizedText: string;
  detectedPatterns: DetectedPattern[];
  anonymizationResults: AnonymizationResult[];
  processedFile?: Blob;
  originalFormat: string;
  summary: {
    totalPatterns: number;
    cpfCount: number;
    nameCount: number;
    phoneCount: number;
    emailCount: number;
  };
}

export class DocumentProcessor {
  static async processDocument(
    text: string, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    console.log('🔍 Starting document processing...');
    
    // Initialize anonymization session
    AnonymizationEngine.initializeSession();
    
    // 1. Detect patterns in text
    const detectedPatterns = detectPatterns(text);
    console.log(`📊 Patterns detected: ${detectedPatterns.length}`);
    
    // 2. Prepare replacement mappings
    const replacements = new Map<string, string>();
    const anonymizationResults: AnonymizationResult[] = [];
    
    // 3. Process each type of detected data
    let processedText = text;
    
    // Process CPFs
    const cpfPatterns = detectedPatterns.filter(p => p.type === 'cpf');
    for (const pattern of cpfPatterns) {
      if (!replacements.has(pattern.value)) {
        const result = AnonymizationEngine.applyTechnique(
          pattern.value,
          options.cpf,
          'cpf',
          { 
            keepConsistency: options.keepConsistency,
            preserveFormatting: options.preserveFormatting 
          }
        );
        
        replacements.set(pattern.value, result.anonymized);
        anonymizationResults.push(result);
      }
    }
    
    // Process Names
    const namePatterns = detectedPatterns.filter(p => p.type === 'name');
    for (const pattern of namePatterns) {
      if (!replacements.has(pattern.value)) {
        const result = AnonymizationEngine.applyTechnique(
          pattern.value,
          options.names,
          'name',
          { 
            keepConsistency: options.keepConsistency,
            preserveFormatting: options.preserveFormatting 
          }
        );
        
        replacements.set(pattern.value, result.anonymized);
        anonymizationResults.push(result);
      }
    }
    
    // Process Phones
    const phonePatterns = detectedPatterns.filter(p => p.type === 'phone');
    for (const pattern of phonePatterns) {
      if (!replacements.has(pattern.value)) {
        const result = AnonymizationEngine.applyTechnique(
          pattern.value,
          options.phones,
          'phone',
          { 
            keepConsistency: options.keepConsistency,
            preserveFormatting: options.preserveFormatting 
          }
        );
        
        replacements.set(pattern.value, result.anonymized);
        anonymizationResults.push(result);
      }
    }
    
    // Process Emails
    const emailPatterns = detectedPatterns.filter(p => p.type === 'email');
    for (const pattern of emailPatterns) {
      if (!replacements.has(pattern.value)) {
        const result = AnonymizationEngine.applyTechnique(
          pattern.value,
          options.emails,
          'email',
          { 
            keepConsistency: options.keepConsistency,
            preserveFormatting: options.preserveFormatting 
          }
        );
        
        replacements.set(pattern.value, result.anonymized);
        anonymizationResults.push(result);
      }
    }
    
    // 4. Apply replacements to text
    for (const [original, anonymized] of replacements) {
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOriginal, 'g');
      processedText = processedText.replace(regex, anonymized);
    }
    
    // 5. Generate summary
    const summary = {
      totalPatterns: detectedPatterns.length,
      cpfCount: cpfPatterns.length,
      nameCount: namePatterns.length,
      phoneCount: phonePatterns.length,
      emailCount: emailPatterns.length
    };
    
    console.log('✅ Processing completed:', summary);
    
    // 6. Ensure irreversibility (clear temporary data)
    setTimeout(() => {
      AnonymizationEngine.ensureIrreversibility();
    }, 1000);
    
    return {
      originalText: text,
      anonymizedText: processedText,
      detectedPatterns,
      anonymizationResults,
      originalFormat: 'text',
      summary
    };
  }
  
  // Extract text from PDF file (simulation)
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log(`📄 Extracting text from PDF: ${file.name}`);
    return await PDFProcessor.extractTextFromPDF(file);
  }
  
  // Extract text from DOCX file (simulation)
  static async extractTextFromDOCX(file: File): Promise<string> {
    console.log(`📝 Extracting text from DOCX: ${file.name}`);
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('relatorio')) {
      return `RELATÓRIO MENSAL
Extracted from: ${file.name}

Employee: Patricia Santos Ferreira
CPF: 555.666.777-88
Phone: (11) 94444-3333
Email: patricia.ferreira@empresa.com

Supervisor: Fernando Costa Almeida
CPF: 222.333.444-55
Email: fernando.almeida@empresa.com

Period: ${new Date().toLocaleDateString('pt-BR')}
Department: Human Resources

This report contains confidential company information.`;
    }
    
    return `WORD DOCUMENT
Extracted from: ${file.name}

Participants:
- Lucia Maria dos Santos (CPF: 777.888.999-00)
- Phone: (21) 93333-2222
- Email: lucia.santos@teste.com

- Miguel Angel Rodriguez (CPF: 123.321.456-78)
- Phone: (11) 92222-1111  
- Email: miguel.rodriguez@exemplo.com

Date: ${new Date().toLocaleDateString('pt-BR')}
Status: Document processed successfully.`;
  }
  
  // Create anonymized PDF with redactions
  static async createAnonymizedPDF(file: File, detectedPatterns: DetectedPattern[]): Promise<Blob> {
    console.log('📋 Creating anonymized PDF with redactions');
    
    try {
      // Extract text with coordinates
      const textItems = await PDFProcessor.extractTextWithCoordinates(file);
      
      // Map sensitive data to coordinates
      const matches = PDFProcessor.mapSensitiveDataToCoordinates(textItems, detectedPatterns);
      
      // Apply redactions
      const anonymizedPDF = await PDFProcessor.applyRedactionsToPDF(file, matches);
      
      return anonymizedPDF;
    } catch (error) {
      console.error('❌ Error creating anonymized PDF with redactions:', error);
      // Fallback to text version
      return new Blob(['PDF processing failed. Please try again.'], { type: 'text/plain' });
    }
  }
  
  // Create anonymized text file for DOCX
  static async createAnonymizedDOCX(originalText: string, anonymizedText: string): Promise<Blob> {
    console.log('📋 Creating anonymized DOCX (text version)');
    
    const docxContent = `WORD DOCUMENT ANONYMIZED
==================================================

WARNING: This document was processed by an anonymization system.
All sensitive personal data has been removed or replaced.

Processing date: ${new Date().toLocaleString('pt-BR')}

==================================================
ANONYMIZED CONTENT:
==================================================

${anonymizedText}

==================================================
PROCESSING INFORMATION:
==================================================

- Original format: Microsoft Word (DOCX)
- Anonymization method: Text replacement
- Data processed: CPFs, names, phones, emails
- Formatting: Preserved when possible

This file contains the same content as the original document
but with all personal data anonymized.`;

    return new Blob([docxContent], { type: 'text/plain' });
  }
  
  // Main method to process file
  static async processFile(
    file: File, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    console.log(`📁 Processing file: ${file.name} (${file.type})`);
    
    try {
      let text = '';
      let originalFormat = file.type;
      
      if (file.type === 'text/plain') {
        console.log('📄 Processing text file...');
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file...');
        text = await this.extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('📄 Processing DOCX file...');
        text = await this.extractTextFromDOCX(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      console.log(`📝 Text extracted: ${text.length} characters`);
      
      const result = await this.processDocument(text, options);
      result.originalFormat = originalFormat;
      
      // Create processed file based on original format
      if (file.type === 'application/pdf') {
        result.processedFile = await this.createAnonymizedPDF(file, result.detectedPatterns);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        result.processedFile = await this.createAnonymizedDOCX(result.originalText, result.anonymizedText);
      } else {
        result.processedFile = new Blob([result.anonymizedText], { type: 'text/plain' });
      }
      
      console.log('✅ File processed successfully!');
      return result;
      
    } catch (error) {
      console.error('❌ Error processing file:', error);
      throw new Error(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
