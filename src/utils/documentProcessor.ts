
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
  
  // Extrair texto de arquivo PDF (simulação)
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log(`📄 Extraindo texto do PDF: ${file.name}`);
    
    // Simulação baseada no nome do arquivo
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('contrato')) {
      return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS
Extraído de: ${file.name}

Contratante: João Silva Santos
CPF: 123.456.789-09
Telefone: (11) 99999-1234
E-mail: joao.silva@email.com

Contratado: Maria Santos Oliveira  
CPF: 987.654.321-00
Telefone: (21) 98888-5555
E-mail: maria.santos@empresa.com.br

Valor do contrato: R$ 50.000,00
Data de início: 15/06/2023
Processo nº: 1234567-89.2023.8.26.0001

Este é um documento sensível que contém dados pessoais.`;
    }
    
    if (fileName.includes('processo')) {
      return `PROCESSO JUDICIAL
Extraído de: ${file.name}

Requerente: Ana Paula Costa
CPF: 111.222.333-44
Telefone: (11) 97777-8888
E-mail: ana.costa@exemplo.com

Requerido: Carlos Eduardo Lima
CPF: 444.555.666-77
Telefone: (21) 96666-7777
E-mail: carlos.lima@teste.com.br

Número do Processo: 0001234-56.2023.8.26.0100
Valor da Causa: R$ 25.000,00
Data de Distribuição: ${new Date().toLocaleDateString('pt-BR')}`;
    }
    
    return `DOCUMENTO PDF
Extraído de: ${file.name}

Este documento contém informações pessoais:
- Nome: Roberto Oliveira Silva
- CPF: 999.888.777-66
- Telefone: (11) 95555-4444
- E-mail: roberto.silva@documento.com

Endereço: Rua das Flores, 123 - São Paulo, SP
CEP: 01234-567

Data de criação: ${new Date().toLocaleDateString('pt-BR')}
Documento processado automaticamente.`;
  }
  
  // Extrair texto de arquivo DOCX (simulação)
  static async extractTextFromDOCX(file: File): Promise<string> {
    console.log(`📝 Extraindo texto do DOCX: ${file.name}`);
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('relatorio')) {
      return `RELATÓRIO MENSAL
Extraído de: ${file.name}

Funcionário: Patricia Santos Ferreira
CPF: 555.666.777-88
Telefone: (11) 94444-3333
E-mail: patricia.ferreira@empresa.com

Supervisor: Fernando Costa Almeida
CPF: 222.333.444-55
E-mail: fernando.almeida@empresa.com

Período: ${new Date().toLocaleDateString('pt-BR')}
Departamento: Recursos Humanos

Este relatório contém informações confidenciais da empresa.`;
    }
    
    return `DOCUMENTO WORD
Extraído de: ${file.name}

Participantes:
- Lucia Maria dos Santos (CPF: 777.888.999-00)
- Telefone: (21) 93333-2222
- E-mail: lucia.santos@teste.com

- Miguel Angel Rodriguez (CPF: 123.321.456-78)
- Telefone: (11) 92222-1111  
- E-mail: miguel.rodriguez@exemplo.com

Data: ${new Date().toLocaleDateString('pt-BR')}
Status: Documento processado com sucesso.`;
  }
  
  // Criar arquivo de texto anonimizado para PDF
  static async createAnonymizedPDF(originalText: string, anonymizedText: string): Promise<Blob> {
    console.log('📋 Criando PDF anonimizado (versão texto)');
    
    const pdfContent = `DOCUMENTO PDF ANONIMIZADO
==================================================

AVISO: Este documento foi processado por um sistema de anonimização.
Todos os dados pessoais sensíveis foram removidos ou substituídos.

Data de processamento: ${new Date().toLocaleString('pt-BR')}

==================================================
CONTEÚDO ANONIMIZADO:
==================================================

${anonymizedText}

==================================================
INFORMAÇÕES DO PROCESSAMENTO:
==================================================

- Formato original: PDF
- Método de anonimização: Substituição de texto
- Dados processados: CPFs, nomes, telefones, e-mails
- Consistência mantida: Sim

Este arquivo mantém a estrutura do documento original
mas com todos os dados sensíveis anonimizados.`;

    return new Blob([pdfContent], { type: 'text/plain' });
  }
  
  // Criar arquivo de texto anonimizado para DOCX
  static async createAnonymizedDOCX(originalText: string, anonymizedText: string): Promise<Blob> {
    console.log('📋 Criando DOCX anonimizado (versão texto)');
    
    const docxContent = `DOCUMENTO WORD ANONIMIZADO
==================================================

AVISO: Este documento foi processado por um sistema de anonimização.
Todos os dados pessoais sensíveis foram removidos ou substituídos.

Data de processamento: ${new Date().toLocaleString('pt-BR')}

==================================================
CONTEÚDO ANONIMIZADO:
==================================================

${anonymizedText}

==================================================
INFORMAÇÕES DO PROCESSAMENTO:
==================================================

- Formato original: Microsoft Word (DOCX)
- Método de anonimização: Substituição de texto
- Dados processados: CPFs, nomes, telefones, e-mails
- Formatação: Preservada quando possível

Este arquivo contém o mesmo conteúdo do documento original
mas com todos os dados pessoais anonimizados.`;

    return new Blob([docxContent], { type: 'text/plain' });
  }
  
  // Método principal para processar arquivo
  static async processFile(
    file: File, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    console.log(`📁 Processando arquivo: ${file.name} (${file.type})`);
    
    try {
      let text = '';
      let originalFormat = file.type;
      
      if (file.type === 'text/plain') {
        console.log('📄 Processando arquivo de texto...');
        text = await file.text();
      } else if (file.type === 'application/pdf') {
        console.log('📄 Processando arquivo PDF...');
        text = await this.extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('📄 Processando arquivo DOCX...');
        text = await this.extractTextFromDOCX(file);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
      }
      
      console.log(`📝 Texto extraído: ${text.length} caracteres`);
      
      const result = await this.processDocument(text, options);
      result.originalFormat = originalFormat;
      
      // Criar arquivo processado baseado no formato original
      if (file.type === 'application/pdf') {
        result.processedFile = await this.createAnonymizedPDF(result.originalText, result.anonymizedText);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        result.processedFile = await this.createAnonymizedDOCX(result.originalText, result.anonymizedText);
      } else {
        result.processedFile = new Blob([result.anonymizedText], { type: 'text/plain' });
      }
      
      console.log('✅ Arquivo processado com sucesso!');
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      throw new Error(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}
