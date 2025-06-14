
import { DetectedPattern } from './patternDetection';
import { NAME_PATTERNS, isValidNameWord, isBrazilianName, NON_NAME_WORDS } from './namePatterns';

export interface NameValidationResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  isBrazilian?: boolean;
}

export class NameDetector {
  private static detectedNames = new Set<string>();
  
  // Detectar nomes usando múltiplas estratégias
  static detectNames(text: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    this.detectedNames.clear();
    
    console.log('🔍 Iniciando detecção avançada de nomes brasileiros...');
    
    // Estratégia 1: Nomes em maiúsculo (rigoroso)
    this.detectByPattern(text, NAME_PATTERNS.UPPERCASE_STRICT, 'uppercase-strict', patterns);
    
    // Estratégia 2: Nomes em maiúsculo (flexível)
    this.detectByPattern(text, NAME_PATTERNS.UPPERCASE_FLEXIBLE, 'uppercase-flexible', patterns);
    
    // Estratégia 3: Nomes mistos
    this.detectByPattern(text, NAME_PATTERNS.MIXED_CASE, 'mixed-case', patterns);
    
    // Estratégia 4: Nomes por contexto
    this.detectContextualNames(text, patterns);
    
    // Remover duplicatas e ordenar por posição
    const uniquePatterns = this.removeDuplicates(patterns);
    
    console.log(`🎯 Total de nomes únicos detectados: ${uniquePatterns.length}`);
    uniquePatterns.forEach(pattern => {
      console.log(`- ${pattern.value} (confiança: ${pattern.confidence}, método: ${(pattern as any).method || 'unknown'})`);
    });
    
    return uniquePatterns.sort((a, b) => a.startIndex - b.startIndex);
  }
  
  // Detectar nomes usando uma regex específica
  private static detectByPattern(
    text: string, 
    regex: RegExp, 
    method: string, 
    patterns: DetectedPattern[]
  ): void {
    regex.lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const nameValue = match[1] || match[0];
      const cleanName = nameValue.trim();
      
      if (this.detectedNames.has(cleanName)) {
        continue; // Já detectado
      }
      
      const validation = this.validateNameCandidate(cleanName, method);
      
      if (validation.isValid) {
        patterns.push({
          type: 'name',
          value: cleanName,
          startIndex: match.index + (match[0].indexOf(cleanName)),
          endIndex: match.index + match[0].length,
          confidence: validation.confidence,
          ...{ method } // Adicionar método para debug
        });
        
        this.detectedNames.add(cleanName);
        console.log(`✅ Nome detectado (${method}): "${cleanName}" (confiança: ${validation.confidence})`);
      } else {
        console.log(`❌ Nome rejeitado (${method}): "${cleanName}" - ${validation.reason}`);
      }
    }
  }
  
  // Detectar nomes por contexto
  private static detectContextualNames(text: string, patterns: DetectedPattern[]): void {
    const regex = NAME_PATTERNS.CONTEXTUAL;
    regex.lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const nameValue = match[1].trim();
      
      if (this.detectedNames.has(nameValue)) {
        continue;
      }
      
      const words = nameValue.split(/\s+/);
      
      // Validar se parece um nome válido
      if (words.length >= 2 && words.length <= 6 && words.every(isValidNameWord)) {
        const endIndex = match.index + match[0].length;
        const startIndex = endIndex - nameValue.length;
        
        patterns.push({
          type: 'name',
          value: nameValue,
          startIndex,
          endIndex,
          confidence: 0.95, // Alta confiança para nomes encontrados por contexto
          ...{ method: 'contextual' }
        });
        
        this.detectedNames.add(nameValue);
        console.log(`✅ Nome detectado (contexto): "${nameValue}" (confiança: 0.95)`);
      }
    }
  }
  
  // Validar se um candidato é realmente um nome
  private static validateNameCandidate(nameValue: string, strategy: string): NameValidationResult {
    const words = nameValue.trim().split(/\s+/);
    
    // Filtros básicos
    if (words.length < 2) {
      return { isValid: false, confidence: 0, reason: 'Menos de 2 palavras' };
    }
    
    if (words.length > 6) {
      return { isValid: false, confidence: 0, reason: 'Mais de 6 palavras (muito longo)' };
    }
    
    // Verificar se todas as palavras são válidas
    const invalidWords = words.filter(word => !isValidNameWord(word));
    if (invalidWords.length > 0) {
      return { 
        isValid: false, 
        confidence: 0, 
        reason: `Palavras inválidas: ${invalidWords.join(', ')}` 
      };
    }
    
    // Verificar se contém palavras que definitivamente não são nomes
    const hasNonNameWord = words.some(word => 
      NON_NAME_WORDS.includes(word.toUpperCase())
    );
    
    if (hasNonNameWord) {
      return { isValid: false, confidence: 0, reason: 'Contém palavra não-nome' };
    }
    
    // Verificar se parece com título de documento
    const fullName = nameValue.toUpperCase();
    const documentTitles = ['CONTRATO', 'DOCUMENTO', 'ANEXO', 'CLÁUSULA', 'PREÂMBULO'];
    if (documentTitles.some(title => fullName.includes(title))) {
      return { isValid: false, confidence: 0, reason: 'Parece título de documento' };
    }
    
    // Verificar se é um nome brasileiro típico
    const isBrazilian = isBrazilianName(words);
    
    // Calcular confiança baseada na estratégia e características
    let confidence = 0.70; // Base
    
    if (isBrazilian) {
      confidence += 0.20; // Bonus para nomes brasileiros típicos
    }
    
    if (strategy === 'uppercase-strict' && words.length >= 3) {
      confidence += 0.10; // Bonus para nomes completos em maiúsculo
    }
    
    if (strategy === 'contextual') {
      confidence += 0.15; // Bonus para nomes encontrados por contexto
    }
    
    // Limitar confiança máxima
    confidence = Math.min(0.98, confidence);
    
    return { 
      isValid: true, 
      confidence, 
      isBrazilian 
    };
  }
  
  // Remover padrões duplicados
  private static removeDuplicates(patterns: DetectedPattern[]): DetectedPattern[] {
    const seen = new Map<string, DetectedPattern>();
    
    for (const pattern of patterns) {
      const existing = seen.get(pattern.value);
      if (!existing || pattern.confidence > existing.confidence) {
        seen.set(pattern.value, pattern);
      }
    }
    
    return Array.from(seen.values());
  }
}
