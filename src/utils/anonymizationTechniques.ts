
import { generateSyntheticCPF, generateSyntheticName, generateSyntheticPhone, generateSyntheticEmail } from './syntheticDataGenerator';

export interface AnonymizationResult {
  original: string;
  anonymized: string;
  technique: string;
}

// Gerador de hash para consistência sem reversibilidade
const generateConsistentHash = (input: string, salt: string = 'anon'): string => {
  let hash = 0;
  const combined = input + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// 1. TÉCNICAS DE MASCARAMENTO
export class MaskingTechniques {
  // Mascaramento Total
  static totalMasking(value: string, preserveFormat: boolean = true): string {
    if (!preserveFormat) {
      return '*'.repeat(value.length);
    }
    
    // Preserva formatação (pontos, hífens, parênteses, etc.)
    return value.replace(/[a-zA-Z0-9]/g, '*');
  }

  // Mascaramento Parcial - CPF
  static partialMaskingCPF(cpf: string): string {
    // Remove formatação
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return cpf;
    
    // Formato: ***.456.***-01 (mantém dígitos do meio e verificadores)
    return `***.${numbers.substring(3, 6)}.***-${numbers.substring(9)}`;
  }

  // Mascaramento Parcial - Telefone
  static partialMaskingPhone(phone: string): string {
    const numbers = phone.replace(/\D/g, '');
    
    if (numbers.length === 11) { // Celular
      return `(${numbers.substring(0, 2)}) *****-${numbers.substring(7)}`;
    } else if (numbers.length === 10) { // Fixo
      return `(${numbers.substring(0, 2)}) ****-${numbers.substring(6)}`;
    }
    
    return phone.replace(/\d/g, '*');
  }

  // Mascaramento Parcial - Email
  static partialMaskingEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!domain) return email;
    
    const maskedUsername = username.length > 2 
      ? username.substring(0, 1) + '*'.repeat(username.length - 2) + username.slice(-1)
      : '*'.repeat(username.length);
    
    return `${maskedUsername}@${domain}`;
  }

  // Mascaramento Parcial - Nome
  static partialMaskingName(name: string): string {
    const words = name.split(' ');
    return words.map(word => {
      if (word.length <= 2) return word;
      return word.charAt(0) + '*'.repeat(word.length - 2) + word.slice(-1);
    }).join(' ');
  }
}

// 2. TÉCNICAS DE PSEUDONIMIZAÇÃO
export class PseudonymizationTechniques {
  private static pseudonymMap = new Map<string, string>();
  private static counters = {
    person: 0,
    company: 0,
    document: 0,
    address: 0
  };

  // Pseudônimo para Pessoas
  static generatePersonPseudonym(originalName: string, keepConsistency: boolean = true): string {
    if (keepConsistency && this.pseudonymMap.has(originalName)) {
      return this.pseudonymMap.get(originalName)!;
    }

    const pseudonym = `PESSOA_${String(++this.counters.person).padStart(3, '0')}`;
    
    if (keepConsistency) {
      this.pseudonymMap.set(originalName, pseudonym);
    }
    
    return pseudonym;
  }

  // Pseudônimo para Empresas
  static generateCompanyPseudonym(originalName: string, keepConsistency: boolean = true): string {
    if (keepConsistency && this.pseudonymMap.has(originalName)) {
      return this.pseudonymMap.get(originalName)!;
    }

    const pseudonym = `EMPRESA_${String(++this.counters.company).padStart(3, '0')}`;
    
    if (keepConsistency) {
      this.pseudonymMap.set(originalName, pseudonym);
    }
    
    return pseudonym;
  }

  // Pseudônimo para Documentos/Processos
  static generateDocumentPseudonym(originalDoc: string, keepConsistency: boolean = true): string {
    if (keepConsistency && this.pseudonymMap.has(originalDoc)) {
      return this.pseudonymMap.get(originalDoc)!;
    }

    const pseudonym = `DOC_${String(++this.counters.document).padStart(3, '0')}`;
    
    if (keepConsistency) {
      this.pseudonymMap.set(originalDoc, pseudonym);
    }
    
    return pseudonym;
  }

  // Limpar mapeamentos (garantir irreversibilidade)
  static clearMappings(): void {
    this.pseudonymMap.clear();
    this.counters = { person: 0, company: 0, document: 0, address: 0 };
  }
}

// 3. SUBSTITUIÇÃO SINTÉTICA
export class SyntheticSubstitution {
  // CPF Sintético (válido mas falso)
  static generateSyntheticCPF(originalCPF: string, keepConsistency: boolean = true): string {
    if (keepConsistency) {
      const hash = generateConsistentHash(originalCPF);
      const seed = parseInt(hash.substring(0, 8), 36);
      return generateSyntheticCPF(seed);
    }
    
    return generateSyntheticCPF();
  }

  // Nome Sintético
  static generateSyntheticName(originalName: string, keepConsistency: boolean = true): string {
    if (keepConsistency) {
      const hash = generateConsistentHash(originalName);
      const seed = parseInt(hash.substring(0, 8), 36);
      return generateSyntheticName(seed);
    }
    
    return generateSyntheticName();
  }

  // Telefone Sintético
  static generateSyntheticPhone(originalPhone: string, keepConsistency: boolean = true): string {
    if (keepConsistency) {
      const hash = generateConsistentHash(originalPhone);
      const seed = parseInt(hash.substring(0, 8), 36);
      return generateSyntheticPhone(seed);
    }
    
    return generateSyntheticPhone();
  }

  // Email Sintético
  static generateSyntheticEmail(originalEmail: string, keepConsistency: boolean = true): string {
    if (keepConsistency) {
      const hash = generateConsistentHash(originalEmail);
      const seed = parseInt(hash.substring(0, 8), 36);
      return generateSyntheticEmail(seed);
    }
    
    return generateSyntheticEmail();
  }
}

// 4. GENERALIZAÇÃO
export class GeneralizationTechniques {
  // Generalização de Datas
  static generalizeDates(dateStr: string, level: 'year' | 'month' | 'decade' = 'year'): string {
    const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) return dateStr;
    
    const [, day, month, year] = dateMatch;
    
    switch (level) {
      case 'year':
        return `XX/XX/${year}`;
      case 'month':
        return `XX/${month}/${year}`;
      case 'decade':
        const decade = Math.floor(parseInt(year) / 10) * 10;
        return `XX/XX/${decade}s`;
      default:
        return dateStr;
    }
  }

  // Generalização de Valores
  static generalizeValues(valueStr: string, level: 'thousands' | 'tenThousands' | 'range' = 'thousands'): string {
    const valueMatch = valueStr.match(/R?\$?\s*([\d.,]+)/);
    if (!valueMatch) return valueStr;
    
    const numStr = valueMatch[1].replace(/[.,]/g, '');
    const value = parseInt(numStr);
    
    if (isNaN(value)) return valueStr;
    
    switch (level) {
      case 'thousands':
        const thousands = Math.floor(value / 1000) * 1000;
        return `R$ ${thousands.toLocaleString('pt-BR')},00+`;
      case 'tenThousands':
        const tenThousands = Math.floor(value / 10000) * 10000;
        return `R$ ${tenThousands.toLocaleString('pt-BR')},00+`;
      case 'range':
        if (value < 10000) return 'R$ 0 - R$ 10.000';
        if (value < 50000) return 'R$ 10.000 - R$ 50.000';
        if (value < 100000) return 'R$ 50.000 - R$ 100.000';
        return 'R$ 100.000+';
      default:
        return valueStr;
    }
  }

  // Generalização de Endereços
  static generalizeAddress(address: string): string {
    // Remove números específicos e mantém apenas tipo de logradouro
    return address
      .replace(/\d+/g, 'XXX')
      .replace(/,\s*\d+.*$/, ', XXX')
      .replace(/n°?\s*\d+/gi, 'nº XXX');
  }
}

// SISTEMA PRINCIPAL DE ANONIMIZAÇÃO
export class AnonymizationEngine {
  private static sessionSalt: string = '';

  // Inicializar sessão (gera salt único)
  static initializeSession(): void {
    this.sessionSalt = Date.now().toString(36) + Math.random().toString(36);
  }

  // Aplicar técnica específica
  static applyTechnique(
    value: string,
    technique: string,
    dataType: string,
    options: { keepConsistency?: boolean; preserveFormatting?: boolean } = {}
  ): AnonymizationResult {
    const { keepConsistency = true, preserveFormatting = true } = options;
    let anonymized = value;
    
    try {
      switch (dataType) {
        case 'cpf':
          switch (technique) {
            case 'partial':
              anonymized = MaskingTechniques.partialMaskingCPF(value);
              break;
            case 'full':
              anonymized = MaskingTechniques.totalMasking(value, preserveFormatting);
              break;
            case 'pseudonym':
              anonymized = PseudonymizationTechniques.generateDocumentPseudonym(value, keepConsistency);
              break;
            case 'synthetic':
              anonymized = SyntheticSubstitution.generateSyntheticCPF(value, keepConsistency);
              break;
          }
          break;
          
        case 'name':
          switch (technique) {
            case 'partial':
              anonymized = MaskingTechniques.partialMaskingName(value);
              break;
            case 'pseudonym':
              anonymized = PseudonymizationTechniques.generatePersonPseudonym(value, keepConsistency);
              break;
            case 'synthetic':
              anonymized = SyntheticSubstitution.generateSyntheticName(value, keepConsistency);
              break;
            case 'initials':
              anonymized = value.split(' ').map(word => word.charAt(0) + '.').join(' ');
              break;
          }
          break;
          
        case 'phone':
          switch (technique) {
            case 'partial':
              anonymized = MaskingTechniques.partialMaskingPhone(value);
              break;
            case 'full':
              anonymized = MaskingTechniques.totalMasking(value, preserveFormatting);
              break;
            case 'synthetic':
              anonymized = SyntheticSubstitution.generateSyntheticPhone(value, keepConsistency);
              break;
          }
          break;
          
        case 'email':
          switch (technique) {
            case 'partial':
              anonymized = MaskingTechniques.partialMaskingEmail(value);
              break;
            case 'full':
              anonymized = MaskingTechniques.totalMasking(value, preserveFormatting);
              break;
            case 'synthetic':
              anonymized = SyntheticSubstitution.generateSyntheticEmail(value, keepConsistency);
              break;
          }
          break;
      }
    } catch (error) {
      console.error('Erro na anonimização:', error);
      anonymized = MaskingTechniques.totalMasking(value, preserveFormatting);
    }

    return {
      original: value,
      anonymized,
      technique: `${dataType}_${technique}`
    };
  }

  // Garantir irreversibilidade - limpar todos os dados temporários
  static ensureIrreversibility(): void {
    PseudonymizationTechniques.clearMappings();
    this.sessionSalt = '';
    
    // Força garbage collection se disponível
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    console.log('✅ Sessão de anonimização finalizada - dados temporários removidos');
  }
}
