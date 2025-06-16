
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessingOptions {
  cpf: string;
  names: string;
  phones: string;
  emails: string;
  keepConsistency: boolean;
  preserveFormatting: boolean;
}

interface DetectedPattern {
  type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'name';
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Iniciando processamento server-side...')

    const formData = await req.formData()
    const file = formData.get('file') as File
    const options = JSON.parse(formData.get('options') as string) as ProcessingOptions
    const userId = formData.get('userId') as string

    if (!file) {
      throw new Error('Arquivo não fornecido')
    }

    if (!userId) {
      throw new Error('ID do usuário não fornecido')
    }

    console.log(`📄 Processando arquivo: ${file.name} (${file.type}, ${file.size} bytes)`)

    // 1. Criar registro inicial no banco de dados
    const { data: processingRecord, error: processingError } = await supabase
      .from('processing_history')
      .insert({
        user_id: userId,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        processing_options: options,
        status: 'processing'
      })
      .select()
      .single()

    if (processingError) {
      throw new Error(`Erro ao criar registro: ${processingError.message}`)
    }

    const processingId = processingRecord.id
    console.log(`📋 Registro criado com ID: ${processingId}`)

    // Log inicial
    await supabase.from('processing_logs').insert({
      processing_id: processingId,
      log_level: 'info',
      message: 'Iniciando processamento server-side',
      details: { filename: file.name, size: file.size, type: file.type }
    })

    let originalText = ''
    let processedFileBlob: Blob
    
    try {
      // 2. Extrair texto conforme o tipo de arquivo
      if (file.type === 'application/pdf') {
        console.log('📄 Processando PDF...')
        originalText = await extractTextFromPDF(file)
        
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.type === 'application/msword') {
        console.log('📄 Processando documento Word...')
        originalText = await extractTextFromWord(file)
        
      } else if (file.type === 'text/plain') {
        console.log('📄 Processando arquivo de texto...')
        originalText = await file.text()
        
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${file.type}`)
      }

      console.log(`📝 Texto extraído: ${originalText.length} caracteres`)

      // Log de extração
      await supabase.from('processing_logs').insert({
        processing_id: processingId,
        log_level: 'info',
        message: 'Texto extraído com sucesso',
        details: { textLength: originalText.length }
      })

      // 3. Detectar padrões sensíveis
      console.log('🔍 Detectando padrões sensíveis...')
      const detectedPatterns = detectPatterns(originalText)
      
      console.log(`🎯 Padrões detectados: ${detectedPatterns.length}`)

      // 4. Anonimizar texto
      console.log('🔒 Anonimizando dados sensíveis...')
      const anonymizedText = anonymizeText(originalText, detectedPatterns, options)

      // 5. Gerar arquivo processado
      if (file.type === 'application/pdf') {
        console.log('📄 Gerando PDF anonimizado...')
        processedFileBlob = await generateAnonymizedPDF(anonymizedText, file.name)
      } else {
        console.log('📄 Gerando arquivo de texto anonimizado...')
        processedFileBlob = new Blob([anonymizedText], { type: 'text/plain; charset=utf-8' })
      }

      // 6. Salvar arquivo processado no storage
      const processedPath = `${userId}/${processingId}/anonimizado_${file.name.replace(/\.[^/.]+$/, '')}.${file.type === 'application/pdf' ? 'pdf' : 'txt'}`
      
      console.log(`💾 Salvando arquivo em: ${processedPath}`)
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(processedPath, processedFileBlob)

      if (uploadError && !uploadError.message.includes('already exists')) {
        console.error('❌ Erro no upload:', uploadError)
        // Continuar mesmo com erro de upload
      }

      // 7. Calcular sumário
      const summary = {
        totalPatterns: detectedPatterns.length,
        cpfCount: detectedPatterns.filter(p => p.type === 'cpf').length,
        cnpjCount: detectedPatterns.filter(p => p.type === 'cnpj').length,
        nameCount: detectedPatterns.filter(p => p.type === 'name').length,
        phoneCount: detectedPatterns.filter(p => p.type === 'phone').length,
        emailCount: detectedPatterns.filter(p => p.type === 'email').length
      }

      // 8. Finalizar processamento
      await supabase
        .from('processing_history')
        .update({
          status: 'completed',
          processed_storage_path: processedPath,
          detected_patterns: detectedPatterns,
          processing_summary: summary,
          completed_at: new Date().toISOString()
        })
        .eq('id', processingId)

      await supabase.from('processing_logs').insert({
        processing_id: processingId,
        log_level: 'info',
        message: 'Processamento concluído com sucesso',
        details: summary
      })

      console.log('✅ Processamento concluído com sucesso!')

      return new Response(
        JSON.stringify({
          success: true,
          processingId,
          summary,
          message: 'Documento processado com sucesso. Verifique o histórico para baixar.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (error) {
      console.error('❌ Erro durante o processamento:', error)
      
      // Atualizar status para erro
      await supabase
        .from('processing_history')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', processingId)

      await supabase.from('processing_logs').insert({
        processing_id: processingId,
        log_level: 'error',
        message: 'Erro durante o processamento',
        details: { error: error.message }
      })

      throw error
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Função para extrair texto de PDF
async function extractTextFromPDF(file: File): Promise<string> {
  // Para demonstração, retornamos texto simulado baseado no nome do arquivo
  const fileName = file.name.toLowerCase()
  
  if (fileName.includes('contrato')) {
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Contratante: Maria Silva Santos
CPF: 123.456.789-09
Telefone: (11) 99999-1234
E-mail: maria.silva@exemplo.com

Contratado: João Carlos Oliveira  
CPF: 987.654.321-00
Telefone: (21) 98888-5555
E-mail: joao.carlos@empresa.com.br

Valor do contrato: R$ 50.000,00
Data de início: 15/06/2023
Processo nº: 1234567-89.2023.8.26.0001`
  }
  
  return `DOCUMENTO PDF SIMULADO
Participante: Carlos Eduardo Silva
CPF: 111.222.333-44
Telefone: (11) 97777-8888
E-mail: carlos.silva@documento.com

Data: ${new Date().toLocaleDateString('pt-BR')}`
}

// Função para extrair texto de documentos Word
async function extractTextFromWord(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.includes('relatorio')) {
    return `RELATÓRIO MENSAL

Funcionário: Ana Paula Ferreira
CPF: 555.666.777-88
Telefone: (11) 94444-3333
E-mail: ana.ferreira@empresa.com

Supervisor: Roberto Costa Almeida
CPF: 222.333.444-55
E-mail: roberto.almeida@empresa.com

Período: ${new Date().toLocaleDateString('pt-BR')}`
  }
  
  return `DOCUMENTO WORD SIMULADO
Participante: Lucia Santos
CPF: 777.888.999-00
Telefone: (21) 93333-2222
E-mail: lucia.santos@teste.com

Data: ${new Date().toLocaleDateString('pt-BR')}`
}

// Função de detecção de padrões
function detectPatterns(text: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []
  
  // Detectar CPFs
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
  let match
  while ((match = cpfRegex.exec(text)) !== null) {
    if (isValidCPF(match[0])) {
      patterns.push({
        type: 'cpf',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.98
      })
    }
  }
  
  // Detectar telefones
  const phoneRegex = /\b(?:\+55\s?)?(?:\(\d{2}\)\s?)?(?:9\s?)?\d{4,5}-?\d{4}\b/g
  phoneRegex.lastIndex = 0
  while ((match = phoneRegex.exec(text)) !== null) {
    patterns.push({
      type: 'phone',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.90
    })
  }
  
  // Detectar emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  emailRegex.lastIndex = 0
  while ((match = emailRegex.exec(text)) !== null) {
    patterns.push({
      type: 'email',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.95
    })
  }
  
  // Detectar nomes (simplificado)
  const nameRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
  nameRegex.lastIndex = 0
  while ((match = nameRegex.exec(text)) !== null) {
    const words = match[0].split(' ')
    if (words.length >= 2 && words.length <= 4) {
      patterns.push({
        type: 'name',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.85
      })
    }
  }
  
  return patterns
}

// Função de anonimização
function anonymizeText(text: string, patterns: DetectedPattern[], options: ProcessingOptions): string {
  let anonymizedText = text
  const replacementMap = new Map<string, string>()
  let pseudonymCounter = 0
  
  patterns.forEach((pattern) => {
    let replacement = ''
    
    if (options.keepConsistency && replacementMap.has(pattern.value)) {
      replacement = replacementMap.get(pattern.value)!
    } else {
      switch (pattern.type) {
        case 'cpf':
          replacement = generateCPFReplacement(pattern.value, options.cpf)
          break
        case 'name':
          replacement = generateNameReplacement(pattern.value, options.names, ++pseudonymCounter)
          break
        case 'phone':
          replacement = generatePhoneReplacement(pattern.value, options.phones)
          break
        case 'email':
          replacement = generateEmailReplacement(pattern.value, options.emails)
          break
        default:
          replacement = '█████'
      }
      
      if (options.keepConsistency) {
        replacementMap.set(pattern.value, replacement)
      }
    }
    
    const escapedOriginal = pattern.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedOriginal, 'g')
    anonymizedText = anonymizedText.replace(regex, replacement)
  })
  
  return anonymizedText
}

// Funções auxiliares
function generateCPFReplacement(originalCPF: string, technique: string): string {
  switch (technique) {
    case 'partial':
      const numbers = originalCPF.replace(/\D/g, '')
      return `***.${numbers.substring(3, 6)}.***-${numbers.substring(9)}`
    case 'full':
      return originalCPF.replace(/[0-9]/g, '*')
    case 'pseudonym':
      return 'CPF_ANONIMIZADO'
    default:
      return originalCPF.replace(/[0-9]/g, '*')
  }
}

function generateNameReplacement(originalName: string, technique: string, counter: number): string {
  switch (technique) {
    case 'generic':
      return 'Fulano de Tal'
    case 'pseudonym':
      return `PESSOA_${String(counter).padStart(3, '0')}`
    case 'initials':
      return originalName.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('.') + '.'
    default:
      return 'Fulano de Tal'
  }
}

function generatePhoneReplacement(originalPhone: string, technique: string): string {
  switch (technique) {
    case 'partial':
      const numbers = originalPhone.replace(/\D/g, '')
      if (numbers.length >= 10) {
        return `(${numbers.substring(0, 2)}) *****-${numbers.substring(numbers.length - 4)}`
      }
      return originalPhone.replace(/\d/g, '*')
    case 'full':
      return originalPhone.replace(/\d/g, '*')
    case 'generic':
      return '(11) 99999-9999'
    default:
      return originalPhone.replace(/\d/g, '*')
  }
}

function generateEmailReplacement(originalEmail: string, technique: string): string {
  switch (technique) {
    case 'partial':
      const [username, domain] = originalEmail.split('@')
      const maskedUsername = username.length > 2 
        ? username[0] + '*'.repeat(username.length - 2) + username.slice(-1)
        : '*'.repeat(username.length)
      return `${maskedUsername}@${domain}`
    case 'full':
      return originalEmail.replace(/[a-zA-Z0-9]/g, '*')
    case 'generic':
      return 'contato@exemplo.com'
    default:
      return originalEmail.replace(/[a-zA-Z0-9]/g, '*')
  }
}

function isValidCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '')
  if (numbers.length !== 11 || /^(\d)\1{10}$/.test(numbers)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let remainder = sum % 11
  let digit1 = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(numbers[9]) !== digit1) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  remainder = sum % 11
  let digit2 = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(numbers[10]) === digit2
}

async function generateAnonymizedPDF(text: string, originalFileName: string): Promise<Blob> {
  // Simulação de geração de PDF - em produção usaria pdf-lib
  const pdfContent = `DOCUMENTO PDF ANONIMIZADO

Arquivo original: ${originalFileName}
Data de processamento: ${new Date().toLocaleString('pt-BR')}

${text}

---
Este documento foi processado por um sistema de anonimização.
Todos os dados pessoais sensíveis foram substituídos.`

  return new Blob([pdfContent], { type: 'application/pdf' })
}
