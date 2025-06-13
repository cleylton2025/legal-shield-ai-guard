
import { detectPatterns, DetectedPattern } from './patternDetection';
import { AnonymizationEngine, AnonymizationResult } from './anonymizationTechniques';

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
    console.log('🔍 Iniciando processamento do documento...');
    
    // Inicializar sessão de anonimização
    AnonymizationEngine.initializeSession();
    
    // 1. Detectar padrões no texto
    const detectedPatterns = detectPatterns(text);
    console.log(`📊 Padrões detectados: ${detectedPatterns.length}`);
    
    // 2. Preparar mapeamento de substituições
    const replacements = new Map<string, string>();
    const anonymizationResults: AnonymizationResult[] = [];
    
    // 3. Processar cada tipo de dado detectado
    let processedText = text;
    
    // Processar CPFs
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
    
    // Processar Nomes
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
    
    // Processar Telefones
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
    
    // Processar E-mails
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
    
    // 4. Aplicar substituições no texto
    for (const [original, anonymized] of replacements) {
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOriginal, 'g');
      processedText = processedText.replace(regex, anonymized);
    }
    
    // 5. Gerar resumo
    const summary = {
      totalPatterns: detectedPatterns.length,
      cpfCount: cpfPatterns.length,
      nameCount: namePatterns.length,
      phoneCount: phonePatterns.length,
      emailCount: emailPatterns.length
    };
    
    console.log('✅ Processamento concluído:', summary);
    
    // 6. Garantir irreversibilidade (limpar dados temporários)
    setTimeout(() => {
      AnonymizationEngine.ensureIrreversibility();
    }, 1000); // Pequeno delay para garantir que a UI foi atualizada
    
    return {
      originalText: text,
      anonymizedText: processedText,
      detectedPatterns,
      anonymizationResults,
      summary
    };
  }
  
  // Método para processar arquivo
  static async processFile(
    file: File, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    console.log(`📁 Processando arquivo: ${file.name}`);
    
    try {
      let text = '';
      
      if (file.type === 'text/plain') {
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        // Para PDF, retorna texto simulado (implementação completa exigiria biblioteca específica)
        text = `[CONTEÚDO PDF SIMULADO]\n\nEste é um documento simulado contendo:\n- CPF: 123.456.789-09\n- Nome: João Silva Santos\n- Telefone: (11) 99999-1234\n- E-mail: joao.silva@email.com\n\nProcesso nº 1234567-89.2023.8.26.0001\nValor da causa: R$ 50.000,00\nData: 15/06/2023`;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Para DOCX, retorna texto simulado
        text = `[CONTEÚDO DOCX SIMULADO]\n\nContrato de Prestação de Serviços\n\nContratante: Maria Santos Oliveira\nCPF: 987.654.321-00\nTelefone: (21) 98888-5555\nE-mail: maria.santos@empresa.com.br\n\nValor do contrato: R$ 25.000,00\nData de início: 01/07/2023`;
      } else {
        throw new Error('Tipo de arquivo não suportado');
      }
      
      return await this.processDocument(text, options);
      
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      throw new Error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}
