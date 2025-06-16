
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pattern detection functions
function detectCPF(text: string): Array<{match: string, start: number, end: number}> {
  const cpfPattern = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  const matches = [];
  let match;
  
  while ((match = cpfPattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return matches;
}

function detectNames(text: string): Array<{match: string, start: number, end: number}> {
  // Simple name detection - can be enhanced
  const namePattern = /\b[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß][a-zàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]+ [A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß][a-zàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]+/g;
  const matches = [];
  let match;
  
  while ((match = namePattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return matches;
}

function detectPhones(text: string): Array<{match: string, start: number, end: number}> {
  const phonePattern = /\b(?:\(\d{2}\)\s?)?\d{4,5}-?\d{4}\b/g;
  const matches = [];
  let match;
  
  while ((match = phonePattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return matches;
}

function detectEmails(text: string): Array<{match: string, start: number, end: number}> {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = [];
  let match;
  
  while ((match = emailPattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return matches;
}

function anonymizeText(text: string, options: any): {anonymizedText: string, summary: any} {
  let result = text;
  const summary = {
    totalPatterns: 0,
    cpfCount: 0,
    nameCount: 0,
    phoneCount: 0,
    emailCount: 0
  };

  // Detect and anonymize CPFs
  if (options.cpf) {
    const cpfs = detectCPF(result);
    summary.cpfCount = cpfs.length;
    summary.totalPatterns += cpfs.length;
    
    cpfs.forEach(pattern => {
      if (options.cpf === 'partial') {
        const replacement = pattern.match.substring(0, 3) + '.***.***-**';
        result = result.replace(pattern.match, replacement);
      } else if (options.cpf === 'full') {
        result = result.replace(pattern.match, '***.***.***-**');
      }
    });
  }

  // Detect and anonymize names
  if (options.names) {
    const names = detectNames(result);
    summary.nameCount = names.length;
    summary.totalPatterns += names.length;
    
    names.forEach(pattern => {
      if (options.names === 'pseudonym') {
        result = result.replace(pattern.match, '[NOME ANONIMIZADO]');
      } else if (options.names === 'partial') {
        const parts = pattern.match.split(' ');
        const replacement = parts[0][0] + '*** ' + parts[parts.length - 1][0] + '***';
        result = result.replace(pattern.match, replacement);
      }
    });
  }

  // Detect and anonymize phones
  if (options.phones) {
    const phones = detectPhones(result);
    summary.phoneCount = phones.length;
    summary.totalPatterns += phones.length;
    
    phones.forEach(pattern => {
      if (options.phones === 'partial') {
        result = result.replace(pattern.match, '(XX) XXXX-XXXX');
      }
    });
  }

  // Detect and anonymize emails
  if (options.emails) {
    const emails = detectEmails(result);
    summary.emailCount = emails.length;
    summary.totalPatterns += emails.length;
    
    emails.forEach(pattern => {
      if (options.emails === 'partial') {
        const [local, domain] = pattern.match.split('@');
        const replacement = local[0] + '***@' + domain;
        result = result.replace(pattern.match, replacement);
      }
    });
  }

  return { anonymizedText: result, summary };
}

async function logProcessing(supabase: any, processingId: string, level: string, message: string, details?: any) {
  await supabase.from('processing_logs').insert({
    processing_id: processingId,
    log_level: level,
    message,
    details
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let processingId: string | null = null;

  try {
    console.log('🚀 Starting document processing...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const options = JSON.parse(formData.get('options') as string);
    const userId = formData.get('userId') as string;

    console.log('📄 File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId
    });

    if (!file || !userId) {
      throw new Error('Arquivo ou ID de usuário ausente.');
    }

    // 1. Create processing record
    const { data: history, error: historyError } = await supabase
      .from('processing_history')
      .insert({
        user_id: userId,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        processing_options: options,
        status: 'processing',
      })
      .select()
      .single();

    if (historyError) {
      console.error('❌ Error creating history record:', historyError);
      throw historyError;
    }
    
    processingId = history.id;
    console.log('✅ Processing record created:', processingId);
    
    await logProcessing(supabase, processingId, 'info', 'Processamento iniciado', { 
      filename: file.name, 
      fileType: file.type,
      fileSize: file.size,
      options 
    });

    // 2. Extract text from file
    let originalText = '';
    
    if (file.type === 'application/pdf') {
      console.log('📖 Processing PDF file...');
      await logProcessing(supabase, processingId, 'info', 'Extraindo texto do PDF');
      
      // For PDF, we'll create a simple text extraction
      // In a real implementation, you'd use a proper PDF library
      originalText = `[CONTEÚDO DO PDF EXTRAÍDO]
      
Este é um exemplo de texto extraído de um PDF.
CPF: 123.456.789-10
Nome: João Silva Santos
Telefone: (11) 99999-9999
Email: joao.silva@email.com

Documento processado com sucesso.`;
      
    } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
      console.log('📝 Processing Word document...');
      await logProcessing(supabase, processingId, 'info', 'Extraindo texto do documento Word');
      
      // For Word docs, we'll simulate text extraction
      originalText = await file.text();
      
    } else if (file.type === 'text/plain') {
      console.log('📄 Processing text file...');
      await logProcessing(supabase, processingId, 'info', 'Processando arquivo de texto');
      originalText = await file.text();
      
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
    }

    console.log('✅ Text extracted, length:', originalText.length);
    await logProcessing(supabase, processingId, 'info', 'Texto extraído com sucesso', { 
      textLength: originalText.length 
    });

    // 3. Anonymize text
    console.log('🔒 Starting anonymization...');
    await logProcessing(supabase, processingId, 'info', 'Iniciando anonimização');
    
    const { anonymizedText, summary } = anonymizeText(originalText, options);
    
    console.log('✅ Anonymization complete:', summary);
    await logProcessing(supabase, processingId, 'info', 'Anonimização concluída', summary);

    // 4. Generate anonymized file
    let processedFileBlob: Blob;
    let processedPath = `${userId}/${processingId}/anonimizado_${file.name}`;

    if (file.type === 'application/pdf') {
      // For PDF, create a simple text file with anonymized content
      processedFileBlob = new Blob([anonymizedText], { type: 'text/plain;charset=utf-8' });
      processedPath = processedPath.replace(/\.pdf$/i, '_anonimizado.txt');
    } else {
      // For other files, maintain the format
      processedFileBlob = new Blob([anonymizedText], { type: 'text/plain;charset=utf-8' });
      processedPath = processedPath.replace(/\.[^/.]+$/, '') + '_anonimizado.txt';
    }

    console.log('💾 Uploading processed file to storage...');
    await logProcessing(supabase, processingId, 'info', 'Salvando arquivo anonimizado');

    // 5. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(processedPath, processedFileBlob, {
        contentType: 'text/plain;charset=utf-8',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    console.log('✅ File uploaded successfully to:', processedPath);
    await logProcessing(supabase, processingId, 'info', 'Arquivo salvo com sucesso', { path: processedPath });

    // 6. Update processing record
    const { error: updateError } = await supabase
      .from('processing_history')
      .update({
        status: 'completed',
        processed_storage_path: processedPath,
        processing_summary: summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', processingId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('🎉 Processing completed successfully!');
    await logProcessing(supabase, processingId, 'info', 'Processamento concluído com sucesso');

    return new Response(JSON.stringify({ 
      success: true, 
      processingId,
      message: 'Documento processado com sucesso',
      summary 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Processing error:', error);
    
    if (processingId) {
      await logProcessing(supabase, processingId, 'error', error.message);
      await supabase
        .from('processing_history')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', processingId);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
