
export interface NameAnonymizationOptions {
  technique: 'generic' | 'pseudonym' | 'initials';
  keepConsistency: boolean;
}

export class NameAnonymizer {
  private static pseudonymCounter = 0;
  private static consistencyMap = new Map<string, string>();
  
  // Resetar estado da sessão
  static resetSession(): void {
    this.pseudonymCounter = 0;
    this.consistencyMap.clear();
  }
  
  // Anonimizar um nome específico
  static anonymizeName(originalName: string, options: NameAnonymizationOptions): string {
    // Verificar consistência
    if (options.keepConsistency && this.consistencyMap.has(originalName)) {
      return this.consistencyMap.get(originalName)!;
    }
    
    let anonymized: string;
    
    switch (options.technique) {
      case 'generic':
        anonymized = this.generateGenericName(originalName);
        break;
      case 'pseudonym':
        anonymized = this.generatePseudonym();
        break;
      case 'initials':
        anonymized = this.generateInitials(originalName);
        break;
      default:
        anonymized = this.generateGenericName(originalName);
    }
    
    // Armazenar para consistência
    if (options.keepConsistency) {
      this.consistencyMap.set(originalName, anonymized);
    }
    
    console.log(`🔄 Nome anonimizado: "${originalName}" → "${anonymized}" (técnica: ${options.technique})`);
    
    return anonymized;
  }
  
  // Gerar nome genérico
  private static generateGenericName(originalName: string): string {
    const words = originalName.trim().split(/\s+/);
    
    // Mapear diferentes padrões de nome genérico
    if (words.length === 2) {
      return 'Fulano de Tal';
    } else if (words.length === 3) {
      return 'Fulano da Silva';
    } else if (words.length >= 4) {
      return 'Fulano de Tal Santos';
    }
    
    return 'Fulano de Tal';
  }
  
  // Gerar pseudônimo sequencial
  private static generatePseudonym(): string {
    this.pseudonymCounter++;
    return `PESSOA_${String(this.pseudonymCounter).padStart(3, '0')}`;
  }
  
  // Gerar iniciais
  private static generateInitials(originalName: string): string {
    const words = originalName.trim().split(/\s+/);
    
    // Conectores que devem ser ignorados nas iniciais
    const connectors = ['DA', 'DE', 'DO', 'DOS', 'DAS', 'E'];
    
    const initials = words
      .filter(word => !connectors.includes(word.toUpperCase()))
      .map(word => word.charAt(0).toUpperCase())
      .join('.');
    
    return initials + '.';
  }
  
  // Obter estatísticas da sessão
  static getSessionStats(): { totalAnonymized: number; consistencyEntries: number } {
    return {
      totalAnonymized: this.pseudonymCounter,
      consistencyEntries: this.consistencyMap.size
    };
  }
  
  // Obter mapeamento de consistência (para debug)
  static getConsistencyMap(): Map<string, string> {
    return new Map(this.consistencyMap);
  }
}
