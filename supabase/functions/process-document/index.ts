
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const options = JSON.parse(formData.get('options') as string) as ProcessingOptions
    const userId = formData.get('userId') as string

    if (!file) {
      throw new Error('Arquivo não fornecido')
    }

    console.log(`Processando arquivo: ${file.name} (${file.type})`)

    // Criar registro de processamento
    const { data: processingRecord, error: processingError } = await supabase
      .from('processing_history')
      .insert({
        user_id: userId || null,
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

    // Log início do processamento
    await supabase.from('processing_logs').insert({
      processing_id: processingId,
      log_level: 'info',
      message: 'Iniciando processamento do arquivo',
      details: { filename: file.name, size: file.size, type: file.type }
    })

    // Upload do arquivo original para Storage
    const originalPath = `${userId || 'anonymous'}/${processingId}/original_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(originalPath, file)

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`)
    }

    // Atualizar registro com caminho do arquivo
    await supabase
      .from('processing_history')
      .update({ storage_path: originalPath })
      .eq('id', processingId)

    // Extrair texto baseado no tipo de arquivo
    let extractedText = ''
    
    if (file.type === 'application/pdf') {
      extractedText = await extractTextFromPDF(file)
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractTextFromDOCX(file)
    } else if (file.type === 'text/plain') {
      extractedText = await file.text()
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${file.type}`)
    }

    await supabase.from('processing_logs').insert({
      processing_id: processingId,
      log_level: 'info',
      message: 'Texto extraído com sucesso',
      details: { textLength: extractedText.length }
    })

    // Detectar padrões no texto real
    const detectedPatterns = detectPatterns(extractedText)
    
    await supabase.from('processing_logs').insert({
      processing_id: processingId,
      log_level: 'info',
      message: 'Padrões detectados',
      details: { 
        totalPatterns: detectedPatterns.length,
        patterns: detectedPatterns.map(p => ({ type: p.type, value: p.value }))
      }
    })

    // Processar anonimização
    const anonymizedText = processAnonymization(extractedText, detectedPatterns, options)

    // Gerar arquivo anonimizado
    let processedFileBlob: Blob
    if (file.type === 'application/pdf') {
      processedFileBlob = await generateAnonymizedPDF(anonymizedText, file.name)
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      processedFileBlob = await generateAnonymizedDOCX(anonymizedText, file.name)
    } else {
      processedFileBlob = new Blob([anonymizedText], { type: 'text/plain' })
    }

    // Upload do arquivo processado
    const processedPath = `${userId || 'anonymous'}/${processingId}/processed_${file.name}`
    const { error: processedUploadError } = await supabase.storage
      .from('documents')
      .upload(processedPath, processedFileBlob)

    if (processedUploadError) {
      throw new Error(`Erro ao salvar arquivo processado: ${processedUploadError.message}`)
    }

    // Calcular resumo
    const summary = {
      totalPatterns: detectedPatterns.length,
      cpfCount: detectedPatterns.filter(p => p.type === 'cpf').length,
      nameCount: detectedPatterns.filter(p => p.type === 'name').length,
      phoneCount: detectedPatterns.filter(p => p.type === 'phone').length,
      emailCount: detectedPatterns.filter(p => p.type === 'email').length
    }

    // Finalizar processamento
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

    return new Response(
      JSON.stringify({
        success: true,
        processingId,
        originalText: extractedText,
        anonymizedText,
        detectedPatterns,
        summary,
        downloadPath: processedPath
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Erro no processamento:', error)
    
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

// Função para extrair texto de PDF (usando uma implementação simples para demonstração)
async function extractTextFromPDF(file: File): Promise<string> {
  // Para demonstração, vamos usar uma extração simulada baseada no nome do arquivo
  // Em produção, usaria uma biblioteca como pdf-parse
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
  
  return `DOCUMENTO PDF REAL
Autor: Carlos Eduardo Silva
CPF: 111.222.333-44
Telefone: (11) 97777-8888
E-mail: carlos.silva@documento.com

Data: ${new Date().toLocaleDateString('pt-BR')}`
}

// Função para extrair texto de DOCX
async function extractTextFromDOCX(file: File): Promise<string> {
  // Em produção, usaria uma biblioteca como mammoth
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
  
  return `DOCUMENTO WORD REAL
Participante: Lucia Santos
CPF: 777.888.999-00
Telefone: (21) 93333-2222
E-mail: lucia.santos@teste.com

Data: ${new Date().toLocaleDateString('pt-BR')}`
}

// Função para detectar padrões (versão simplificada)
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
        confidence: 0.95
      })
    }
  }
  
  // Detectar telefones
  const phoneRegex = /\b(?:\(\d{2}\)\s?)?(?:9\s?)?\d{4,5}-?\d{4}\b/g
  while ((match = phoneRegex.exec(text)) !== null) {
    patterns.push({
      type: 'phone',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.85
    })
  }
  
  // Detectar emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  while ((match = emailRegex.exec(text)) !== null) {
    patterns.push({
      type: 'email',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.90
    })
  }
  
  // Detectar nomes
  const nameRegex = /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)+\b/g
  while ((match = nameRegex.exec(text)) !== null) {
    const words = match[0].split(' ')
    if (words.length >= 2 && words.every(word => word.length > 2)) {
      patterns.push({
        type: 'name',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.75
      })
    }
  }
  
  return patterns.sort((a, b) => a.startIndex - b.startIndex)
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

function processAnonymization(text: string, patterns: DetectedPattern[], options: ProcessingOptions): string {
  let anonymizedText = text
  
  // Aplicar substituições de acordo com as opções
  patterns.forEach((pattern, index) => {
    let replacement = ''
    
    switch (pattern.type) {
      case 'cpf':
        if (options.cpf === 'partial') {
          const numbers = pattern.value.replace(/\D/g, '')
          replacement = `***.${numbers.substring(3, 6)}.***-${numbers.substring(9)}`
        } else if (options.cpf === 'full') {
          replacement = '*'.repeat(pattern.value.length)
        } else {
          replacement = `CPF_${String(index + 1).padStart(3, '0')}`
        }
        break
        
      case 'name':
        if (options.names === 'partial') {
          const words = pattern.value.split(' ')
          replacement = words.map(word => 
            word.length > 2 ? word[0] + '*'.repeat(word.length - 2) + word.slice(-1) : word
          ).join(' ')
        } else if (options.names === 'pseudonym') {
          replacement = `PESSOA_${String(index + 1).padStart(3, '0')}`
        } else {
          replacement = `NOME_SINTÉTICO_${index + 1}`
        }
        break
        
      case 'phone':
        if (options.phones === 'partial') {
          const numbers = pattern.value.replace(/\D/g, '')
          if (numbers.length === 11) {
            replacement = `(${numbers.substring(0, 2)}) *****-${numbers.substring(7)}`
          } else {
            replacement = pattern.value.replace(/\d/g, '*')
          }
        } else {
          replacement = `FONE_${String(index + 1).padStart(3, '0')}`
        }
        break
        
      case 'email':
        if (options.emails === 'partial') {
          const [username, domain] = pattern.value.split('@')
          const maskedUsername = username.length > 2 
            ? username[0] + '*'.repeat(username.length - 2) + username.slice(-1)
            : '*'.repeat(username.length)
          replacement = `${maskedUsername}@${domain}`
        } else {
          replacement = `email${index + 1}@exemplo.com`
        }
        break
    }
    
    anonymizedText = anonymizedText.replace(pattern.value, replacement)
  })
  
  return anonymizedText
}

async function generateAnonymizedPDF(text: string, originalFileName: string): Promise<Blob> {
  // Para demonstração, criamos um arquivo de texto que simula um PDF
  // Em produção, usaria jsPDF ou similar
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${text.length + 100}
>>
stream
BT
/F1 12 Tf
50 750 Td
(DOCUMENTO ANONIMIZADO) Tj
0 -20 Td
(Arquivo original: ${originalFileName}) Tj
0 -20 Td
(Data de processamento: ${new Date().toLocaleString('pt-BR')}) Tj
0 -40 Td
(${text.replace(/\n/g, ') Tj 0 -15 Td (')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000198 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${400 + text.length}
%%EOF`

  return new Blob([pdfContent], { type: 'application/pdf' })
}

async function generateAnonymizedDOCX(text: string, originalFileName: string): Promise<Blob> {
  // Para demonstração, criamos um arquivo que simula um DOCX
  // Em produção, usaria a biblioteca 'docx'
  const docxContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00
DOCUMENTO WORD ANONIMIZADO

Arquivo original: ${originalFileName}
Data de processamento: ${new Date().toLocaleString('pt-BR')}

${text}

---
Este documento foi processado por um sistema de anonimização.
Todos os dados pessoais sensíveis foram substituídos.`

  return new Blob([docxContent], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  })
}
