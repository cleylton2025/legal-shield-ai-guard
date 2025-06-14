
// Lista de prenomes brasileiros mais comuns (amostra representativa)
export const COMMON_FIRST_NAMES = [
  // Masculinos
  'JOÃO', 'JOSÉ', 'ANTÔNIO', 'FRANCISCO', 'CARLOS', 'PAULO', 'PEDRO', 'LUCAS', 'LUIZ', 'MARCOS',
  'LUIS', 'GABRIEL', 'RAFAEL', 'DANIEL', 'MARCELO', 'BRUNO', 'EDUARDO', 'FELIPE', 'RAIMUNDO',
  'RODRIGO', 'MANOEL', 'NELSON', 'ROBERTO', 'FABIO', 'LEONARDO', 'JORGE', 'ANDERSON', 'ADRIANO',
  'ALEXANDRE', 'ANDRÉ', 'ANTONIO', 'AUGUSTO', 'CAIO', 'CESAR', 'CHRISTIAN', 'CLAUDIO', 'CRISTIANO',
  'DIEGO', 'DOUGLAS', 'ELIAS', 'FERNANDO', 'FLAVIO', 'GUILHERME', 'GUSTAVO', 'HENRIQUE', 'IVAN',
  'JOÃO', 'JONATHAN', 'JULIANO', 'LEANDRO', 'LUCIANO', 'MARCIO', 'MARIO', 'MATEUS', 'MAURICIO',
  'RICARDO', 'SERGIO', 'TIAGO', 'VINICIUS', 'WAGNER', 'WESLEY', 'WILLIAM', 'ALAN', 'ALEX',
  'DANILO', 'DIEGO', 'EDSON', 'EMERSON', 'EVERTON', 'JEAN', 'JEFFERSON', 'JUNIOR', 'KEVIN',
  'LEONARDO', 'LUCIANO', 'MARCELO', 'MARCOS', 'MAURO', 'MICHAEL', 'MICHEL', 'MURILO', 'OTAVIO',
  'PATRICK', 'RAFAEL', 'RAMON', 'RENAN', 'RENATO', 'ROBSON', 'RONALD', 'SAMUEL', 'THIAGO',
  'VICTOR', 'WASHINGTON', 'WELLINGTON', 'YURI', 'DERLAN', 'RICHELMY',
  
  // Femininos
  'MARIA', 'ANA', 'FRANCISCA', 'ANTÔNIA', 'ADRIANA', 'JULIANA', 'MÁRCIA', 'FERNANDA', 'PATRICIA',
  'ALINE', 'SANDRA', 'CAMILA', 'AMANDA', 'BRUNA', 'JESSICA', 'LETICIA', 'JULIA', 'LUCIANA',
  'VANESSA', 'MARIANA', 'GABRIELA', 'VALERIA', 'CRISTINA', 'ROSANGELA', 'ROSEANE', 'SIMONE',
  'CLAUDIA', 'MONICA', 'DEBORA', 'VIVIANE', 'DANIELA', 'LIVIA', 'NATALIA', 'PRISCILA', 'REGINA',
  'SABRINA', 'CARLA', 'AMANDA', 'ANDREIA', 'ANGELA', 'BEATRIZ', 'BIANCA', 'CAROLINE', 'CELIA',
  'DAYANE', 'DENISE', 'ELAINE', 'ELISANGELA', 'FABIANA', 'FLAVIA', 'GISELE', 'HELENA', 'INGRID',
  'ISABEL', 'JAQUELINE', 'JOYCE', 'KARINA', 'LARISSA', 'LILIAN', 'LUCIANE', 'MICHELE', 'MONIQUE',
  'NATHALIA', 'RAQUEL', 'ROSANA', 'SONIA', 'TATIANA', 'THAIS', 'VERA', 'VIVIAN', 'KELLY',
  'JANAINA', 'KATIA', 'LUANA', 'MARTA', 'PAULA', 'ROBERTA', 'SILVIA', 'SUELEN', 'TERESA'
];

// Lista de sobrenomes brasileiros mais comuns
export const COMMON_LAST_NAMES = [
  'SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'RODRIGUES', 'FERREIRA', 'ALVES', 'PEREIRA', 'LIMA',
  'GOMES', 'COSTA', 'RIBEIRO', 'MARTINS', 'CARVALHO', 'ALMEIDA', 'LOPES', 'SOARES', 'FERNANDES',
  'VIEIRA', 'BARBOSA', 'ROCHA', 'DIAS', 'MONTEIRO', 'CARDOSO', 'REIS', 'ARAÚJO', 'NASCIMENTO',
  'MORAIS', 'CASTRO', 'MIRANDA', 'CAMPOS', 'CORREIA', 'TEIXEIRA', 'RAMOS', 'BATISTA', 'FREITAS',
  'MOREIRA', 'MELO', 'ANDRADE', 'MACHADO', 'NUNES', 'BARROS', 'MOURA', 'MENDES', 'CRUZ',
  'CALDEIRA', 'FONSECA', 'DUARTE', 'AZEVEDO', 'COELHO', 'MORAES', 'NOGUEIRA', 'CAVALCANTI',
  'GONÇALVES', 'CHIARELI', 'LENGRUBER', 'PIOL', 'CARMINATI', 'PAYER', 'NATO', 'GRONCHI',
  'ZANATTA', 'BONDING', 'ARTIFICIAL', 'INTELLIGENCE'
];

// Palavras que NÃO são nomes (expandida e mais específica)
export const NON_NAME_WORDS = [
  // Termos jurídicos
  'BRASIL', 'GOVERNO', 'ESTADO', 'FEDERAL', 'NACIONAL', 'PÚBLICO', 'MUNICIPAL', 'ESTADUAL',
  'TRIBUNAL', 'SUPERIOR', 'JUSTIÇA', 'MINISTÉRIO', 'SECRETARIA', 'DEPARTAMENTO', 'DIRETORIA',
  'PROCESSO', 'RECURSO', 'APELAÇÃO', 'MANDADO', 'SEGURANÇA', 'HABEAS', 'CORPUS',
  'CÓDIGO', 'CIVIL', 'PENAL', 'TRABALHISTA', 'COMERCIAL', 'CONSTITUCIONAL', 'ADMINISTRATIVO',
  'ARTIGO', 'LEI', 'DECRETO', 'PORTARIA', 'RESOLUÇÃO', 'INSTRUÇÃO', 'NORMATIVA',
  'CONTRATO', 'ACORDO', 'FINANCIAMENTO', 'EMPRÉSTIMO', 'CLAUSULA', 'CLÁUSULA',
  'COMPRA', 'VENDA', 'LOCAÇÃO', 'ARRENDAMENTO', 'COMODATO',
  
  // Lugares e instituições
  'CARTÓRIO', 'REGISTRO', 'TÍTULOS', 'DOCUMENTOS', 'NOTAS', 'COMARCA', 'FÓRUM',
  'DELEGACIA', 'POLÍCIA', 'BOMBEIROS', 'HOSPITAL', 'CLÍNICA', 'ESCOLA', 'UNIVERSIDADE',
  'BANCO', 'CAIXA', 'ECONÔMICA', 'BRADESCO', 'ITAÚ', 'SANTANDER',
  
  // Documentos e seções
  'DOCUMENTO', 'ANEXO', 'PREÂMBULO', 'QUALIFICAÇÃO', 'NUBENTES', 'CLÁUSULAS', 'FINAIS',
  'SUCESSÃO', 'DISPOSIÇÕES', 'COMPLEMENTARES', 'PROTEÇÃO', 'EXCLUSÃO', 'PARTICIPAÇÃO',
  'SOCIETÁRIA', 'ESPECIAIS', 'AQUESTOS', 'REGIME', 'BENS', 'ESCOLHIDO',
  
  // Termos técnicos
  'SISTEMA', 'PROGRAMA', 'APLICAÇÃO', 'SOFTWARE', 'HARDWARE', 'INTERNET', 'SITE',
  'PLATAFORMA', 'SERVIÇO', 'PRODUTO', 'EMPRESA', 'SOCIEDADE', 'LIMITADA', 'LTDA',
  
  // Conectores e preposições que podem aparecer em nomes compostos de lugares
  'DA', 'DE', 'DO', 'DOS', 'DAS', 'E', 'EM', 'NA', 'NO', 'COM', 'PARA', 'POR', 'SEM'
];

// Função para verificar se uma palavra é um nome válido
export function isValidNameWord(word: string): boolean {
  const upperWord = word.toUpperCase();
  
  // Muito curta
  if (word.length < 2) return false;
  
  // É uma palavra comum que não é nome
  if (NON_NAME_WORDS.includes(upperWord)) return false;
  
  // Contém números
  if (/\d/.test(word)) return false;
  
  // Apenas pontuação
  if (/^[^\w\u00C0-\u017F]+$/.test(word)) return false;
  
  return true;
}

// Função para verificar se é um nome brasileiro típico
export function isBrazilianName(words: string[]): boolean {
  if (words.length < 2) return false;
  
  const upperWords = words.map(w => w.toUpperCase());
  
  // Verifica se pelo menos uma palavra é um prenome comum
  const hasCommonFirstName = upperWords.some(word => 
    COMMON_FIRST_NAMES.includes(word)
  );
  
  // Verifica se pelo menos uma palavra é um sobrenome comum
  const hasCommonLastName = upperWords.some(word => 
    COMMON_LAST_NAMES.includes(word)
  );
  
  return hasCommonFirstName || hasCommonLastName;
}

// Regex melhorada para nomes completos
export const NAME_PATTERNS = {
  // Nomes em maiúsculo (mais rigoroso)
  UPPERCASE_STRICT: /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}(?:\s+(?:D[AEO]S?|E)\s+)?(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}){1,5}\b/g,
  
  // Nomes em maiúsculo (mais flexível)
  UPPERCASE_FLEXIBLE: /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,})+\b/g,
  
  // Nomes mistos (primeira letra maiúscula)
  MIXED_CASE: /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+(?:da|de|do|dos|das|e|van|von|del|della|di)\s*)?(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)+\b/g,
  
  // Nomes após indicadores contextuais
  CONTEXTUAL: /(?:nome[:\s]+|sr\.?\s+|sra\.?\s+|senhor\s+|senhora\s+|contratante[:\s]+|contratado[:\s]+|cliente[:\s]+|parte[:\s]+|requerente[:\s]+|requerido[:\s]+|autor[:\s]+|réu[:\s]+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi
};
