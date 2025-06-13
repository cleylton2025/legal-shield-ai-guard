
// Listas para geração de dados sintéticos realistas

const NOMES_MASCULINOS = [
  'João', 'Pedro', 'Carlos', 'José', 'Antonio', 'Francisco', 'Paulo', 'Marcos', 'Roberto', 'Rafael',
  'Daniel', 'Bruno', 'Eduardo', 'Fernando', 'Gabriel', 'Lucas', 'Diego', 'Rodrigo', 'Felipe', 'André'
];

const NOMES_FEMININOS = [
  'Maria', 'Ana', 'Carla', 'Patricia', 'Sandra', 'Cristina', 'Fernanda', 'Juliana', 'Mariana', 'Beatriz',
  'Camila', 'Bruna', 'Leticia', 'Vanessa', 'Priscila', 'Renata', 'Claudia', 'Adriana', 'Simone', 'Débora'
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'
];

const DOMINIOS_EMAIL = [
  'gmail.com', 'hotmail.com', 'yahoo.com.br', 'outlook.com', 'uol.com.br', 'terra.com.br',
  'bol.com.br', 'ig.com.br', 'live.com', 'r7.com'
];

// Função para gerar números consistentes baseados em seed
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Gerar CPF sintético válido
export const generateSyntheticCPF = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  // Gera os 9 primeiros dígitos
  const digits: number[] = [];
  for (let i = 0; i < 9; i++) {
    digits.push(Math.floor(seededRandom(randomSeed + i) * 10));
  }
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  digits.push(firstCheck);
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  digits.push(secondCheck);
  
  // Formata o CPF
  const cpfString = digits.join('');
  return `${cpfString.substring(0, 3)}.${cpfString.substring(3, 6)}.${cpfString.substring(6, 9)}-${cpfString.substring(9)}`;
};

// Gerar CNPJ sintético válido
export const generateSyntheticCNPJ = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  // Gera os 12 primeiros dígitos (8 da empresa + 0001 da filial)
  const digits: number[] = [];
  for (let i = 0; i < 8; i++) {
    digits.push(Math.floor(seededRandom(randomSeed + i) * 10));
  }
  digits.push(0, 0, 0, 1); // Filial padrão
  
  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights1[i];
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  digits.push(firstCheck);
  
  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += digits[i] * weights2[i];
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  digits.push(secondCheck);
  
  // Formata o CNPJ
  const cnpjString = digits.join('');
  return `${cnpjString.substring(0, 2)}.${cnpjString.substring(2, 5)}.${cnpjString.substring(5, 8)}/${cnpjString.substring(8, 12)}-${cnpjString.substring(12)}`;
};

// Gerar nome sintético
export const generateSyntheticName = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  const isFemaleName = seededRandom(randomSeed) > 0.5;
  const nomes = isFemaleName ? NOMES_FEMININOS : NOMES_MASCULINOS;
  
  const firstName = nomes[Math.floor(seededRandom(randomSeed + 1) * nomes.length)];
  const lastName = SOBRENOMES[Math.floor(seededRandom(randomSeed + 2) * SOBRENOMES.length)];
  
  // 30% de chance de ter nome do meio
  if (seededRandom(randomSeed + 3) > 0.7) {
    const middleName = SOBRENOMES[Math.floor(seededRandom(randomSeed + 4) * SOBRENOMES.length)];
    return `${firstName} ${middleName} ${lastName}`;
  }
  
  return `${firstName} ${lastName}`;
};

// Gerar telefone sintético
export const generateSyntheticPhone = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  // DDDs válidos do Brasil
  const ddds = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28',
               '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47',
               '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68',
               '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87',
               '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  
  const ddd = ddds[Math.floor(seededRandom(randomSeed) * ddds.length)];
  
  // 70% celular (9 dígitos), 30% fixo (8 dígitos)
  const isMobile = seededRandom(randomSeed + 1) > 0.3;
  
  if (isMobile) {
    // Celular: 9XXXX-XXXX
    const first = 9;
    const second = Math.floor(seededRandom(randomSeed + 2) * 10);
    const third = Math.floor(seededRandom(randomSeed + 3) * 10);
    const fourth = Math.floor(seededRandom(randomSeed + 4) * 10);
    const fifth = Math.floor(seededRandom(randomSeed + 5) * 10);
    const sixth = Math.floor(seededRandom(randomSeed + 6) * 10);
    const seventh = Math.floor(seededRandom(randomSeed + 7) * 10);
    const eighth = Math.floor(seededRandom(randomSeed + 8) * 10);
    const ninth = Math.floor(seededRandom(randomSeed + 9) * 10);
    
    return `(${ddd}) ${first}${second}${third}${fourth}${fifth}-${sixth}${seventh}${eighth}${ninth}`;
  } else {
    // Fixo: XXXX-XXXX
    const digits = [];
    for (let i = 0; i < 8; i++) {
      digits.push(Math.floor(seededRandom(randomSeed + i + 2) * 10));
    }
    
    return `(${ddd}) ${digits.slice(0, 4).join('')}-${digits.slice(4).join('')}`;
  }
};

// Gerar email sintético
export const generateSyntheticEmail = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  const name = generateSyntheticName(randomSeed).toLowerCase().replace(/\s+/g, '.');
  const domain = DOMINIOS_EMAIL[Math.floor(seededRandom(randomSeed + 10) * DOMINIOS_EMAIL.length)];
  
  // Remove acentos do nome
  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.]/g, '');
  
  // 20% de chance de adicionar números
  let username = cleanName;
  if (seededRandom(randomSeed + 11) > 0.8) {
    const numbers = Math.floor(seededRandom(randomSeed + 12) * 99) + 1;
    username += numbers;
  }
  
  return `${username}@${domain}`;
};

// Gerar RG sintético
export const generateSyntheticRG = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  const digits = [];
  for (let i = 0; i < 8; i++) {
    digits.push(Math.floor(seededRandom(randomSeed + i) * 10));
  }
  
  // Dígito verificador (pode ser número ou X)
  const checkDigit = seededRandom(randomSeed + 8) > 0.1 
    ? Math.floor(seededRandom(randomSeed + 9) * 10).toString()
    : 'X';
  
  const rgString = digits.join('');
  return `${rgString.substring(0, 2)}.${rgString.substring(2, 5)}.${rgString.substring(5)}-${checkDigit}`;
};

// Gerar endereço sintético
export const generateSyntheticAddress = (seed?: number): string => {
  const randomSeed = seed || Math.floor(Math.random() * 1000000);
  
  const tiposLogradouro = ['Rua', 'Avenida', 'Travessa', 'Alameda', 'Praça'];
  const nomesRua = ['das Flores', 'do Sol', 'da Paz', 'Santos Dumont', 'Getúlio Vargas', 
                   'das Palmeiras', 'João Pessoa', 'Dom Pedro II', 'da Liberdade', 'Central'];
  
  const tipo = tiposLogradouro[Math.floor(seededRandom(randomSeed) * tiposLogradouro.length)];
  const nome = nomesRua[Math.floor(seededRandom(randomSeed + 1) * nomesRua.length)];
  const numero = Math.floor(seededRandom(randomSeed + 2) * 9999) + 1;
  
  return `${tipo} ${nome}, ${numero}`;
};
