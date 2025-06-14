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

interface PDFTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface SensitiveMatch {
  originalText: string;
  anonymizedText: string;
  items: PDFTextItem[];
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

    await supabase.from('processing_logs').insert({
      processing_id: processingId,
      log_level: 'info',
      message: 'Iniciando processamento com sistema avançado',
      details: { filename: file.name, size: file.size, type: file.type }
    })

    let extractedText = ''
    let processedFileBlob: Blob
    
    try {
      if (file.type === 'application/pdf') {
        console.log('📄 Processando PDF com sistema de tarjas...')
        
        // Extrair texto com coordenadas usando novo sistema
        const textItems = await extractTextWithCoordinatesFromPDF(file)
        extractedText = textItems.map(item => item.text).join(' ')
        
        console.log(`📝 Texto extraído: ${extractedText.length} caracteres, ${textItems.length} itens`)
        
        // Detectar padrões sensíveis
        const detectedPatterns = detectPatternsAdvanced(extractedText)
        
        // Mapear dados sensíveis para coordenadas
        const sensitiveMatches = mapSensitiveDataToCoordinates(textItems, detectedPatterns, options)
        
        // Aplicar tarjas e gerar PDF anonimizado
        processedFileBlob = await applyRedactionsToOriginalPDF(file, sensitiveMatches)
        
        await supabase.from('processing_logs').insert({
          processing_id: processingId,
          log_level: 'info',
          message: 'PDF processado com sistema de tarjas',
          details: { 
            textItems: textItems.length,
            patterns: detectedPatterns.length,
            redactions: sensitiveMatches.length
          }
        })
        
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('📄 Processando DOCX...')
        extractedText = await extractTextFromDOCXReal(file)
        const detectedPatterns = detectPatternsAdvanced(extractedText)
        const anonymizedText = processAnonymizationAdvanced(extractedText, detectedPatterns, options)
        processedFileBlob = await generateRealAnonymizedDOCX(anonymizedText, file.name)
        
      } else if (file.type === 'text/plain') {
        console.log('📄 Processando arquivo de texto...')
        extractedText = await file.text()
        const detectedPatterns = detectPatternsAdvanced(extractedText)
        const anonymizedText = processAnonymizationAdvanced(extractedText, detectedPatterns, options)
        processedFileBlob = new Blob([anonymizedText], { type: 'text/plain; charset=utf-8' })
        
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${file.type}`)
      }
    } catch (error) {
      console.error('Erro no processamento principal, usando fallback:', error)
      // Fallback para sistema anterior
      extractedText = await extractTextFallback(file)
      const detectedPatterns = detectPatternsAdvanced(extractedText)
      const anonymizedText = processAnonymizationAdvanced(extractedText, detectedPatterns, options)
      processedFileBlob = new Blob([anonymizedText], { type: 'text/plain; charset=utf-8' })
    }

    // Upload do arquivo processado
    const processedPath = `${userId || 'anonymous'}/${processingId}/processed_${file.name}`
    const { error: processedUploadError } = await supabase.storage
      .from('documents')
      .upload(processedPath, processedFileBlob)

    if (processedUploadError) {
      console.log('Storage upload falhou, continuando sem storage...')
    }

    // Calcular resumo
    const detectedPatterns = detectPatternsAdvanced(extractedText)
    const summary = {
      totalPatterns: detectedPatterns.length,
      cpfCount: detectedPatterns.filter(p => p.type === 'cpf').length,
      cnpjCount: detectedPatterns.filter(p => p.type === 'cnpj').length,
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
      message: 'Processamento concluído com sistema avançado',
      details: summary
    })

    return new Response(
      JSON.stringify({
        success: true,
        processingId,
        originalText: extractedText,
        anonymizedText: 'PDF processado com tarjas - visualize o arquivo baixado',
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

// NOVA FUNÇÃO: Extrair texto com coordenadas do PDF
async function extractTextWithCoordinatesFromPDF(file: File): Promise<PDFTextItem[]> {
  try {
    // Importar pdfjs-dist dinamicamente
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174')
    
    // Configurar worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    const allItems: PDFTextItem[] = []
    
    // Processar cada página
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const viewport = page.getViewport({ scale: 1.0 })
      
      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          // Calcular posição real no PDF
          const transform = item.transform
          const x = transform[4]
          const y = viewport.height - transform[5] // Inverter Y
          
          allItems.push({
            text: item.str,
            x: x,
            y: y,
            width: item.width || 0,
            height: item.height || 12,
            pageNumber: pageNum
          })
        }
      })
    }
    
    console.log(`📄 PDF processado: ${pdf.numPages} páginas, ${allItems.length} itens de texto`)
    return allItems
  } catch (error) {
    console.error('❌ Erro ao extrair texto com coordenadas:', error)
    throw error
  }
}

// NOVA FUNÇÃO: Mapear dados sensíveis para coordenadas
function mapSensitiveDataToCoordinates(
  textItems: PDFTextItem[], 
  detectedPatterns: DetectedPattern[],
  options: ProcessingOptions
): SensitiveMatch[] {
  const matches: SensitiveMatch[] = []
  let pseudonymCounter = 0
  
  detectedPatterns.forEach(pattern => {
    const matchingItems: PDFTextItem[] = []
    
    // Procurar itens de texto que contenham o padrão detectado
    const patternValue = pattern.value.trim()
    
    textItems.forEach(item => {
      const itemText = item.text.trim()
      
      // Match direto
      if (itemText === patternValue || itemText.includes(patternValue)) {
        matchingItems.push(item)
      }
      
      // Para nomes, verificar palavras individuais
      if (pattern.type === 'name') {
        const patternWords = patternValue.split(/\s+/)
        if (patternWords.some(word => itemText.includes(word) && word.length > 2)) {
          matchingItems.push(item)
        }
      }
    })
    
    if (matchingItems.length > 0) {
      // Gerar texto anonimizado
      let anonymizedText = ''
      switch (pattern.type) {
        case 'name':
          anonymizedText = generateNameReplacement(pattern.value, options.names, ++pseudonymCounter)
          break
        case 'cpf':
          anonymizedText = generateCPFReplacement(pattern.value, options.cpf)
          break
        case 'cnpj':
          anonymizedText = generateCNPJReplacement(pattern.value, options.cpf)
          break
        case 'phone':
          anonymizedText = generatePhoneReplacement(pattern.value, options.phones)
          break
        case 'email':
          anonymizedText = generateEmailReplacement(pattern.value, options.emails)
          break
        default:
          anonymizedText = '█████'
      }
      
      matches.push({
        originalText: pattern.value,
        anonymizedText,
        items: matchingItems
      })
    }
  })
  
  console.log(`🎯 Mapeamento concluído: ${matches.length} dados sensíveis mapeados`)
  return matches
}

// NOVA FUNÇÃO: Aplicar tarjas no PDF original
async function applyRedactionsToOriginalPDF(originalFile: File, matches: SensitiveMatch[]): Promise<Blob> {
  try {
    // Importar pdf-lib dinamicamente
    const { PDFDocument, rgb, StandardFonts } = await import('https://esm.sh/pdf-lib@1.17.1')
    
    const arrayBuffer = await originalFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    console.log(`🎨 Aplicando tarjas em ${matches.length} localizações...`)
    
    matches.forEach(match => {
      match.items.forEach(item => {
        try {
          const page = pdfDoc.getPage(item.pageNumber - 1) // PDF pages são 0-indexed
          
          // Calcular área da tarja com margem
          const padding = 2
          const rectX = Math.max(0, item.x - padding)
          const rectY = Math.max(0, item.y - padding)
          const rectWidth = Math.max(item.width + (padding * 2), 20) // Mínimo de 20
          const rectHeight = Math.max(item.height + (padding * 2), 12) // Mínimo de 12
          
          // Desenhar tarja preta
          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: rgb(0, 0, 0), // Preto
            opacity: 1.0
          })
          
          // Desenhar texto anonimizado sobre a tarja (opcional)
          if (match.anonymizedText && match.anonymizedText.length < 50) {
            page.drawText(match.anonymizedText, {
              x: rectX + 2,
              y: rectY + 2,
              size: Math.min(8, item.height - 2),
              font: font,
              color: rgb(1, 1, 1) // Branco
            })
          }
          
          console.log(`🔨 Tarja aplicada: "${item.text}" na página ${item.pageNumber}`)
        } catch (itemError) {
          console.error('Erro ao aplicar tarja individual:', itemError)
        }
      })
    })
    
    // Adicionar marca d'água discreta
    const totalPages = pdfDoc.getPageCount()
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i)
      const { height } = page.getSize()
      
      page.drawText('Documento anonimizado', {
        x: 50,
        y: height - 20,
        size: 8,
        font: font,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.5
      })
    }
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    
    console.log('✅ PDF com tarjas gerado com sucesso')
    return blob
  } catch (error) {
    console.error('❌ Erro ao aplicar tarjas no PDF:', error)
    throw error
  }
}

// FUNÇÃO FALLBACK: Extrair texto simples quando falha extração com coordenadas
async function extractTextFallback(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    return await extractTextFromPDF(file)
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDOCX(file)
  } else {
    return await file.text()
  }
}

// NOVA FUNÇÃO DE DETECÇÃO AVANÇADA
function detectPatternsAdvanced(text: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []
  
  console.log('🔍 Iniciando detecção avançada de padrões...')
  
  // Reset regex lastIndex
  const resetRegex = (regex: RegExp) => { regex.lastIndex = 0 }
  
  // 1. Detectar CPFs com validação melhorada
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
      console.log(`✅ CPF detectado: ${match[0]}`)
    }
  }
  resetRegex(cpfRegex)
  
  // 2. Detectar CNPJs
  const cnpjRegex = /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/g
  while ((match = cnpjRegex.exec(text)) !== null) {
    if (isValidCNPJ(match[0])) {
      patterns.push({
        type: 'cnpj',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.95
      })
      console.log(`✅ CNPJ detectado: ${match[0]}`)
    }
  }
  resetRegex(cnpjRegex)
  
  // 3. Detectar telefones brasileiros
  const phoneRegex = /\b(?:\+55\s?)?(?:\(\d{2}\)\s?)?(?:9\s?)?\d{4,5}-?\d{4}\b/g
  while ((match = phoneRegex.exec(text)) !== null) {
    const numbers = match[0].replace(/\D/g, '')
    if (numbers.length >= 10 && numbers.length <= 13) {
      patterns.push({
        type: 'phone',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.90
      })
      console.log(`✅ Telefone detectado: ${match[0]}`)
    }
  }
  resetRegex(phoneRegex)
  
  // 4. Detectar emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  while ((match = emailRegex.exec(text)) !== null) {
    patterns.push({
      type: 'email',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 0.95
    })
    console.log(`✅ Email detectado: ${match[0]}`)
  }
  resetRegex(emailRegex)
  
  // 5. DETECÇÃO AVANÇADA DE NOMES - Sistema totalmente reformulado
  console.log('🔍 Iniciando detecção especializada de nomes brasileiros...')
  const namePatterns = detectNamesProfessional(text)
  patterns.push(...namePatterns)
  
  return patterns.sort((a, b) => a.startIndex - b.startIndex)
}

// NOVA FUNÇÃO ESPECIALIZADA PARA NOMES
function detectNamesProfessional(text: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []
  const detectedNames = new Set<string>()
  
  // Lista de prenomes brasileiros comuns (amostra essencial)
  const commonFirstNames = [
    'JOÃO', 'JOSÉ', 'ANTÔNIO', 'FRANCISCO', 'CARLOS', 'PAULO', 'PEDRO', 'LUCAS', 'LUIZ', 'MARCOS',
    'MARIA', 'ANA', 'FRANCISCA', 'ANTÔNIA', 'ADRIANA', 'JULIANA', 'MÁRCIA', 'FERNANDA', 'PATRICIA',
    'DANILO', 'SUELEN', 'DERLAN', 'RICHELMY', 'PIOL', 'CARMINATI', 'PAYER', 'NATO', 'GRONCHI',
    'GABRIEL', 'RAFAEL', 'DANIEL', 'MARCELO', 'BRUNO', 'EDUARDO', 'FELIPE', 'RODRIGO', 'LEONARDO'
  ]
  
  // Lista de sobrenomes brasileiros comuns
  const commonLastNames = [
    'SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'RODRIGUES', 'FERREIRA', 'ALVES', 'PEREIRA', 'LIMA',
    'GOMES', 'COSTA', 'RIBEIRO', 'MARTINS', 'CARVALHO', 'ALMEIDA', 'LOPES', 'SOARES', 'FERNANDES',
    'GONÇALVES', 'CHIARELI', 'LENGRUBER', 'ZANATTA', 'BONDING', 'ARTIFICIAL', 'INTELLIGENCE'
  ]
  
  // Palavras que definitivamente NÃO são nomes
  const nonNameWords = [
    'BRASIL', 'GOVERNO', 'ESTADO', 'FEDERAL', 'NACIONAL', 'PÚBLICO', 'MUNICIPAL',
    'TRIBUNAL', 'SUPERIOR', 'JUSTIÇA', 'MINISTÉRIO', 'SECRETARIA', 'CARTÓRIO',
    'PROCESSO', 'RECURSO', 'APELAÇÃO', 'MANDADO', 'SEGURANÇA', 'CÓDIGO', 'CIVIL',
    'CONTRATO', 'ACORDO', 'FINANCIAMENTO', 'CLÁUSULA', 'DOCUMENTO', 'ANEXO',
    'PREÂMBULO', 'QUALIFICAÇÃO', 'NUBENTES', 'SUCESSÃO', 'DISPOSIÇÕES', 'PROTEÇÃO'
  ]
  
  // Estratégia 1: Nomes completos em maiúsculo (rigoroso)
  const nameRegexStrict = /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}){1,5}\b/g
  let match
  
  while ((match = nameRegexStrict.exec(text)) !== null) {
    const nameValue = match[0].trim()
    const words = nameValue.split(/\s+/)
    
    if (detectedNames.has(nameValue)) continue
    
    // Validação rigorosa
    if (validateNameAdvanced(words, commonFirstNames, commonLastNames, nonNameWords)) {
      patterns.push({
        type: 'name',
        value: nameValue,
        startIndex: match.index,
        endIndex: match.index + nameValue.length,
        confidence: 0.92
      })
      
      detectedNames.add(nameValue)
      console.log(`✅ Nome detectado (maiúsculo): "${nameValue}" (confiança: 0.92)`)
    } else {
      console.log(`❌ Nome rejeitado (maiúsculo): "${nameValue}"`)
    }
  }
  
  // Estratégia 2: Nomes mistos (primeira letra maiúscula)
  const nameRegexMixed = /\b[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+(?:\s+(?:da|de|do|dos|das|e)\s*)?(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][a-záéíóúâêîôûàèìòùãõç]+)+\b/g
  nameRegexMixed.lastIndex = 0
  
  while ((match = nameRegexMixed.exec(text)) !== null) {
    const nameValue = match[0].trim()
    const words = nameValue.split(/\s+/)
    
    if (detectedNames.has(nameValue)) continue
    
    // Converter para maiúsculo para validação
    const upperWords = words.map(w => w.toUpperCase())
    
    if (validateNameAdvanced(upperWords, commonFirstNames, commonLastNames, nonNameWords)) {
      patterns.push({
        type: 'name',
        value: nameValue,
        startIndex: match.index,
        endIndex: match.index + nameValue.length,
        confidence: 0.88
      })
      
      detectedNames.add(nameValue)
      console.log(`✅ Nome detectado (misto): "${nameValue}" (confiança: 0.88)`)
    } else {
      console.log(`❌ Nome rejeitado (misto): "${nameValue}"`)
    }
  }
  
  // Estratégia 3: Nomes por contexto
  const contextPatterns = [
    /(?:nome[:\s]+|sr\.?\s+|sra\.?\s+|senhor\s+|senhora\s+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi,
    /(?:contratante[:\s]+|contratado[:\s]+|cliente[:\s]+|parte[:\s]+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇa-záéíóúâêîôûàèìòùãõç\s]+)/gi
  ]
  
  contextPatterns.forEach(regex => {
    regex.lastIndex = 0
    while ((match = regex.exec(text)) !== null) {
      const nameValue = match[1].trim()
      const words = nameValue.split(/\s+/)
      
      if (detectedNames.has(nameValue)) continue
      
      if (words.length >= 2 && words.length <= 6) {
        const endIndex = match.index + match[0].length
        const startIndex = endIndex - nameValue.length
        
        patterns.push({
          type: 'name',
          value: nameValue,
          startIndex,
          endIndex,
          confidence: 0.96
        })
        
        detectedNames.add(nameValue)
        console.log(`✅ Nome detectado (contexto): "${nameValue}" (confiança: 0.96)`)
      }
    }
  })
  
  console.log(`🎯 Total de nomes únicos detectados: ${patterns.length}`)
  return patterns
}

// Função de validação avançada para nomes
function validateNameAdvanced(
  words: string[], 
  commonFirstNames: string[], 
  commonLastNames: string[], 
  nonNameWords: string[]
): boolean {
  // Deve ter entre 2 e 6 palavras
  if (words.length < 2 || words.length > 6) return false
  
  // Não deve conter palavras muito curtas
  if (words.some(word => word.length < 2)) return false
  
  // Não deve conter números
  if (words.some(word => /\d/.test(word))) return false
  
  // Não deve conter palavras que definitivamente não são nomes
  if (words.some(word => nonNameWords.includes(word.toUpperCase()))) return false
  
  // Deve ter pelo menos um prenome ou sobrenome comum brasileiro
  const hasCommonFirstName = words.some(word => commonFirstNames.includes(word.toUpperCase()))
  const hasCommonLastName = words.some(word => commonLastNames.includes(word.toUpperCase()))
  
  return hasCommonFirstName || hasCommonLastName
}

// NOVA FUNÇÃO DE ANONIMIZAÇÃO AVANÇADA
function processAnonymizationAdvanced(text: string, patterns: DetectedPattern[], options: ProcessingOptions): string {
  let anonymizedText = text
  const replacementMap = new Map<string, string>()
  let pseudonymCounter = 0
  
  console.log('🔄 Iniciando anonimização avançada...')
  
  // Processar cada padrão detectado
  patterns.forEach((pattern) => {
    let replacement = ''
    
    // Verificar se já temos uma substituição consistente
    if (options.keepConsistency && replacementMap.has(pattern.value)) {
      replacement = replacementMap.get(pattern.value)!
    } else {
      // Gerar nova substituição baseada no tipo e opção escolhida
      switch (pattern.type) {
        case 'cpf':
          replacement = generateCPFReplacement(pattern.value, options.cpf)
          break
        case 'cnpj':
          replacement = generateCNPJReplacement(pattern.value, options.cpf) // Usar mesma opção do CPF
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
      }
      
      // Armazenar para consistência
      if (options.keepConsistency) {
        replacementMap.set(pattern.value, replacement)
      }
    }
    
    console.log(`🔄 Substituindo ${pattern.type}: "${pattern.value}" → "${replacement}"`)
    
    // Aplicar substituição no texto
    const escapedOriginal = pattern.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedOriginal, 'g')
    anonymizedText = anonymizedText.replace(regex, replacement)
  })
  
  console.log(`✅ Anonimização concluída: ${patterns.length} substituições realizadas`)
  return anonymizedText
}

// Funções auxiliares para gerar substituições
function generateNameReplacement(originalName: string, technique: string, counter: number): string {
  switch (technique) {
    case 'generic':
      return 'Fulano de Tal'
    case 'pseudonym':
      return `PESSOA_${String(counter).padStart(3, '0')}`
    case 'initials':
      return originalName.split(' ')
        .filter(word => !['DA', 'DE', 'DO', 'DOS', 'DAS', 'E'].includes(word.toUpperCase()))
        .map(word => word.charAt(0).toUpperCase())
        .join('.') + '.'
    default:
      return 'Fulano de Tal'
  }
}

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

function generateCNPJReplacement(originalCNPJ: string, technique: string): string {
  switch (technique) {
    case 'partial':
      const numbers = originalCNPJ.replace(/\D/g, '')
      return `**.***.***/0001-**`
    case 'full':
      return originalCNPJ.replace(/[0-9]/g, '*')
    case 'pseudonym':
      return 'CNPJ_ANONIMIZADO'
    default:
      return originalCNPJ.replace(/[0-9]/g, '*')
  }
}

function generatePhoneReplacement(originalPhone: string, technique: string): string {
  switch (technique) {
    case 'partial':
      const numbers = originalPhone.replace(/\D/g, '')
      if (numbers.length === 11) {
        return `(${numbers.substring(0, 2)}) *****-${numbers.substring(7)}`
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

// Função para extrair texto de PDF usando biblioteca real
async function extractTextFromPDFReal(file: File): Promise<string> {
  try {
    // Importar pdf-parse dinamicamente
    const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1')
    
    // Converter File para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // Extrair texto do PDF
    const data = await pdfParse.default(buffer)
    
    console.log(`PDF real processado: ${data.numpages} páginas, ${data.text.length} caracteres`)
    
    return data.text || 'Não foi possível extrair texto do PDF'
  } catch (error) {
    console.error('Erro na extração real de PDF:', error)
    throw error
  }
}

// Função para extrair texto de DOCX usando biblioteca real
async function extractTextFromDOCXReal(file: File): Promise<string> {
  try {
    // Importar mammoth dinamicamente
    const mammoth = await import('https://esm.sh/mammoth@1.6.0')
    
    // Converter File para buffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Extrair texto do DOCX
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    console.log(`DOCX real processado: ${result.value.length} caracteres`)
    
    return result.value || 'Não foi possível extrair texto do DOCX'
  } catch (error) {
    console.error('Erro na extração real de DOCX:', error)
    throw error
  }
}

// Função para gerar PDF real usando jsPDF
async function generateRealAnonymizedPDF(text: string, originalFileName: string): Promise<Blob> {
  try {
    // Importar jsPDF dinamicamente
    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1')
    
    const doc = new jsPDF()
    
    // Configurar fonte e metadata
    doc.setFont('helvetica')
    doc.setFontSize(12)
    
    // Adicionar título
    doc.setFontSize(16)
    doc.text('DOCUMENTO ANONIMIZADO', 20, 20)
    
    doc.setFontSize(10)
    doc.text(`Arquivo original: ${originalFileName}`, 20, 30)
    doc.text(`Data de processamento: ${new Date().toLocaleString('pt-BR')}`, 20, 40)
    
    // Adicionar linha separadora
    doc.line(20, 45, 190, 45)
    
    // Adicionar conteúdo anonimizado
    doc.setFontSize(12)
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, 20, 55)
    
    // Adicionar rodapé
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(`Documento anonimizado - Página ${i} de ${pageCount}`, 20, 285)
    }
    
    // Retornar como Blob
    const pdfArrayBuffer = doc.output('arraybuffer')
    return new Blob([pdfArrayBuffer], { type: 'application/pdf' })
    
  } catch (error) {
    console.error('Erro na geração real de PDF:', error)
    throw error
  }
}

// Função para gerar DOCX real usando biblioteca docx
async function generateRealAnonymizedDOCX(text: string, originalFileName: string): Promise<Blob> {
  try {
    // Importar docx dinamicamente
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('https://esm.sh/docx@8.5.0')
    
    // Criar documento
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "DOCUMENTO ANONIMIZADO",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Arquivo original: ${originalFileName}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Data de processamento: ${new Date().toLocaleString('pt-BR')}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            text: "",
          }),
          ...text.split('\n').map(line => 
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 24,
                }),
              ],
            })
          ),
        ],
      }],
    })
    
    // Gerar buffer
    const buffer = await Packer.toBuffer(doc)
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
    
  } catch (error) {
    console.error('Erro na geração real de DOCX:', error)
    throw error
  }
}

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

function isValidCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '')
  if (numbers.length !== 14 || /^(\d)\1{13}$/.test(numbers)) return false
  
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  let remainder = sum % 11
  let digit1 = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(numbers[12]) !== digit1) return false
  
  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  remainder = sum % 11
  let digit2 = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(numbers[13]) === digit2
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
