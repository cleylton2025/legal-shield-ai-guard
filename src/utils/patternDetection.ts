
export interface DetectedPattern {
  type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'name';
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

// Lista de palavras comuns para filtrar falsos positivos em nomes
const COMMON_WORDS = [
  'estado', 'brasil', 'governo', 'ministério', 'secretaria', 'municipal',
  'federal', 'nacional', 'público', 'tribunal', 'superior', 'justiça',
  'processo', 'recurso', 'apelação', 'agravo', 'mandado', 'segurança',
  'codigo', 'civil', 'penal', 'trabalhista', 'comercial', 'constitucional'
];

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

// Função principal para detectar padrões
export function detectPatterns(text: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
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
    }
  }
  
  // 2. Detectar CNPJs
  const cnpjRegex = /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/g;
  cpfRegex.lastIndex = 0; // Reset regex
  
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
    }
  }
  
  // 3. Detectar Telefones
  const phoneRegex = /\b(?:\+55\s?)?(?:\(\d{2}\)\s?)?(?:9\s?)?\d{4,5}-?\d{4}\b/g;
  cnpjRegex.lastIndex = 0; // Reset regex
  
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
    }
  }
  
  // 4. Detectar E-mails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  phoneRegex.lastIndex = 0; // Reset regex
  
  while ((match = emailRegex.exec(text)) !== null) {
    const emailValue = match[0];
    patterns.push({
      type: 'email',
      value: emailValue,
      startIndex: match.index,
      endIndex: match.index + emailValue.length,
      confidence: 0.90
    });
  }
  
  // 5. Detectar Nomes Próprios
  const nameRegex = /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)+\b/g;
  emailRegex.lastIndex = 0; // Reset regex
  
  while ((match = nameRegex.exec(text)) !== null) {
    const nameValue = match[0];
    const words = nameValue.toLowerCase().split(/\s+/);
    
    // Filtrar palavras comuns e nomes muito curtos
    const isCommonWord = words.some(word => 
      COMMON_WORDS.includes(word) || word.length < 2
    );
    
    if (!isCommonWord && words.length >= 2) {
      patterns.push({
        type: 'name',
        value: nameValue,
        startIndex: match.index,
        endIndex: match.index + nameValue.length,
        confidence: 0.75
      });
    }
  }
  
  // Ordenar por posição no texto
  patterns.sort((a, b) => a.startIndex - b.startIndex);
  
  console.log(`🔍 Padrões detectados: ${patterns.length}`);
  patterns.forEach(pattern => {
    console.log(`- ${pattern.type.toUpperCase()}: "${pattern.value}" (confiança: ${pattern.confidence})`);
  });
  
  return patterns;
}
