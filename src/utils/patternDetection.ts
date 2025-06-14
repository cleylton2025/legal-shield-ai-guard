import { NameDetector } from './nameDetector';

export interface DetectedPattern {
  type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'name';
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

// Função principal para detectar padrões - TOTALMENTE REFORMULADA
export function detectPatterns(text: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  console.log('🔍 Iniciando detecção avançada de padrões...');
  
  // Reset regex lastIndex
  const resetRegex = (regex: RegExp) => { regex.lastIndex = 0; };
  
  // 1. Detectar CPFs
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  let match;
  
  while ((match = cpfRegex.exec(text)) !== null) {
    const cpfValue = match[0];
    if (isValidCPF(cpfValue)) {
      patterns.push({
        type: 'cpf',
        value: cpfValue,
        startIndex: match.index,
        endIndex: match.index + cpfValue.length,
        confidence: 0.95
      });
      console.log(`✅ CPF detectado: ${cpfValue}`);
    }
  }
  resetRegex(cpfRegex);
  
  // 2. Detectar CNPJs
  const cnpjRegex = /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/g;
  
  while ((match = cnpjRegex.exec(text)) !== null) {
    const cnpjValue = match[0];
    if (isValidCNPJ(cnpjValue)) {
      patterns.push({
        type: 'cnpj',
        value: cnpjValue,
        startIndex: match.index,
        endIndex: match.index + cnpjValue.length,
        confidence: 0.95
      });
      console.log(`✅ CNPJ detectado: ${cnpjValue}`);
    }
  }
  resetRegex(cnpjRegex);
  
  // 3. Detectar Telefones
  const phoneRegex = /\b(?:\+55\s?)?(?:\(\d{2}\)\s?)?(?:9\s?)?\d{4,5}-?\d{4}\b/g;
  
  while ((match = phoneRegex.exec(text)) !== null) {
    const phoneValue = match[0];
    // Validação básica: deve ter pelo menos 8 dígitos
    const digitCount = phoneValue.replace(/\D/g, '').length;
    if (digitCount >= 8 && digitCount <= 13) {
      patterns.push({
        type: 'phone',
        value: phoneValue,
        startIndex: match.index,
        endIndex: match.index + phoneValue.length,
        confidence: 0.85
      });
      console.log(`✅ Telefone detectado: ${phoneValue}`);
    }
  }
  resetRegex(phoneRegex);
  
  // 4. Detectar E-mails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  while ((match = emailRegex.exec(text)) !== null) {
    const emailValue = match[0];
    patterns.push({
      type: 'email',
      value: emailValue,
      startIndex: match.index,
      endIndex: match.index + emailValue.length,
      confidence: 0.90
    });
    console.log(`✅ Email detectado: ${emailValue}`);
  }
  resetRegex(emailRegex);
  
  // 5. NOVA DETECÇÃO DE NOMES - Usando NameDetector
  console.log('🔍 Iniciando detecção especializada de nomes...');
  const namePatterns = NameDetector.detectNames(text);
  patterns.push(...namePatterns);
  
  // Ordenar por posição no texto
  patterns.sort((a, b) => a.startIndex - b.startIndex);
  
  console.log(`🎯 RESUMO: ${patterns.length} padrões detectados no total`);
  const summary = patterns.reduce((acc, pattern) => {
    acc[pattern.type] = (acc[pattern.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`- ${type.toUpperCase()}: ${count} ocorrências`);
  });
  
  return patterns;
}

// Função para validar candidatos a nome
function validateNameCandidate(nameValue: string, strategy: 'strict' | 'mixed'): { isValid: boolean; confidence: number; reason?: string } {
  const words = nameValue.trim().split(/\s+/);
  
  // Filtrar palavras muito curtas
  if (words.some(word => word.length < 2)) {
    return { isValid: false, confidence: 0, reason: 'Palavras muito curtas' };
  }
  
  // Deve ter pelo menos 2 palavras
  if (words.length < 2) {
    return { isValid: false, confidence: 0, reason: 'Menos de 2 palavras' };
  }
  
  // Lista reduzida de palavras comuns para filtrar (mais permissiva)
  const commonWords = [
    'BRASIL', 'GOVERNO', 'ESTADO', 'FEDERAL', 'NACIONAL', 'PÚBLICO', 'MUNICIPAL',
    'TRIBUNAL', 'SUPERIOR', 'JUSTIÇA', 'MINISTÉRIO', 'SECRETARIA',
    'PROCESSO', 'RECURSO', 'APELAÇÃO', 'MANDADO', 'SEGURANÇA',
    'CÓDIGO', 'CIVIL', 'PENAL', 'TRABALHISTA', 'COMERCIAL', 'CONSTITUCIONAL',
    'ARTIGO', 'LEI', 'DECRETO', 'PORTARIA', 'RESOLUÇÃO',
    'COMPRA', 'VENDA', 'CONTRATO', 'ACORDO', 'FINANCIAMENTO'
  ];
  
  // Verificar se contém palavras comuns
  const hasCommonWord = words.some(word => 
    commonWords.includes(word.toUpperCase())
  );
  
  if (hasCommonWord) {
    return { isValid: false, confidence: 0, reason: 'Contém palavra comum' };
  }
  
  // Verificar padrões que não são nomes
  const fullName = nameValue.toUpperCase();
  
  // Rejeitar se parece com título de documento ou seção
  if (fullName.includes('CONTRATO') || fullName.includes('DOCUMENTO') || 
      fullName.includes('ANEXO') || fullName.includes('CLÁUSULA')) {
    return { isValid: false, confidence: 0, reason: 'Parece título de documento' };
  }
  
  // Aceitar nomes que passaram nos filtros
  let confidence = 0.85; // Base para nomes válidos
  
  // Aumentar confiança para nomes típicos brasileiros
  if (strategy === 'strict' && words.length >= 3) {
    confidence = 0.90; // Nomes completos em maiúsculo
  }
  
  // Aumentar confiança se tem padrão típico de nome brasileiro
  const hasTypicalPattern = words.some(word => 
    ['SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'RODRIGUES', 'FERREIRA', 
     'ALVES', 'PEREIRA', 'LIMA', 'GOMES', 'COSTA', 'RIBEIRO', 'MARTINS',
     'CARVALHO', 'ALMEIDA', 'LOPES', 'SOARES', 'FERNANDES', 'VIEIRA',
     'BARBOSA', 'ROCHA', 'DIAS', 'MONTEIRO', 'CARDOSO', 'REIS', 'ARAÚJO'].includes(word.toUpperCase())
  );
  
  if (hasTypicalPattern) {
    confidence = Math.min(0.95, confidence + 0.1);
  }
  
  return { isValid: true, confidence };
}

// Função para detectar nomes por contexto
function detectNamesByContext(text: string): DetectedPattern[] {
  const contextualPatterns: DetectedPattern[] = [];
  
  // Padrões contextuais que indicam nomes
  const contextPatterns = [
    /(?:nome[:\s]+|sr\.?\s+|sra\.?\s+|senhor\s+|senhora\s+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi,
    /(?:contratante[:\s]+|contratado[:\s]+|cliente[:\s]+|parte[:\s]+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi,
    /(?:requerente[:\s]+|requerido[:\s]+|autor[:\s]+|réu[:\s]+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi
  ];
  
  contextPatterns.forEach(regex => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const nameValue = match[1].trim();
      const words = nameValue.split(/\s+/);
      
      // Validar se parece um nome válido
      if (words.length >= 2 && words.length <= 6) {
        const endIndex = match.index + match[0].length;
        const startIndex = endIndex - nameValue.length;
        
        contextualPatterns.push({
          type: 'name',
          value: nameValue,
          startIndex,
          endIndex,
          confidence: 0.92 // Alta confiança para nomes encontrados por contexto
        });
      }
    }
    regex.lastIndex = 0;
  });
  
  return contextualPatterns;
}

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[9]) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numbers[10]) === digit2;
}

// Função para validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[12]) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numbers[13]) === digit2;
}
