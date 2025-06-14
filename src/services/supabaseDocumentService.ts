import { supabase } from "@/integrations/supabase/client";
import { ProcessingOptions } from "@/utils/documentProcessor";

export interface ProcessingResult {
  processingId: string;
  originalText: string;
  anonymizedText: string;
  detectedPatterns: any[];
  summary: {
    totalPatterns: number;
    cpfCount: number;
    nameCount: number;
    phoneCount: number;
    emailCount: number;
  };
  downloadPath: string;
}

export class SupabaseDocumentService {
  static async processDocument(file: File, options: ProcessingOptions): Promise<ProcessingResult> {
    console.log('🚀 Enviando documento para processamento avançado...');
    
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Criar FormData para envio
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));
    if (user) {
      formData.append('userId', user.id);
    }
    
    // Construir URL da Edge Function
    const functionUrl = `https://xidbqqozwknlcpcnfhfp.supabase.co/functions/v1/process-document`;
    
    console.log('📤 Fazendo requisição para:', functionUrl);
    console.log('🔑 Token disponível:', !!session?.access_token);
    
    // Chamar Edge Function com fetch direto
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: formData,
    });
    
    console.log('📦 Resposta recebida:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      throw new Error(`Erro no processamento: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido no processamento');
    }
    
    console.log('✅ Documento processado com sistema avançado:', data.summary);
    
    return {
      processingId: data.processingId,
      originalText: data.originalText,
      anonymizedText: data.anonymizedText,
      detectedPatterns: data.detectedPatterns,
      summary: data.summary,
      downloadPath: data.downloadPath
    };
  }
  
  static async downloadProcessedFile(downloadPath: string, originalFileName: string): Promise<void> {
    console.log('📥 Baixando arquivo processado...');
    
    try {
      // Baixar do storage do Supabase
      const { data, error } = await supabase.storage
        .from('documents')
        .download(downloadPath);
      
      if (error) {
        console.error('❌ Erro no download:', error);
        throw new Error(`Erro no download: ${error.message}`);
      }
      
      // Verificar se o arquivo é válido
      if (!data || data.size === 0) {
        throw new Error('Arquivo vazio ou corrompido');
      }
      
      // Determinar tipo MIME correto baseado na extensão do arquivo baixado
      const fileExtension = downloadPath.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      let downloadName = originalFileName;
      
      switch (fileExtension) {
        case 'pdf':
          mimeType = 'application/pdf';
          downloadName = originalFileName.replace(/\.[^/.]+$/, '_anonimizado.pdf');
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          downloadName = originalFileName.replace(/\.[^/.]+$/, '_anonimizado.docx');
          break;
        case 'txt':
          mimeType = 'text/plain; charset=utf-8';
          downloadName = originalFileName.replace(/\.[^/.]+$/, '_anonimizado.txt');
          break;
      }
      
      // Criar blob com tipo MIME correto
      const blob = new Blob([data], { type: mimeType });
      
      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL temporária
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('✅ Download concluído:', downloadName);
    } catch (error) {
      console.error('❌ Erro no download:', error);
      throw new Error(`Não foi possível baixar o arquivo: ${error.message}`);
    }
  }
  
  static async getProcessingHistory(): Promise<any[]> {
    console.log('📋 Buscando histórico de processamentos...');
    
    const { data, error } = await supabase
      .from('processing_history')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }
    
    return data || [];
  }
  
  static async getProcessingLogs(processingId: string): Promise<any[]> {
    console.log(`📊 Buscando logs do processamento ${processingId}...`);
    
    const { data, error } = await supabase
      .from('processing_logs')
      .select('*')
      .eq('processing_id', processingId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar logs:', error);
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }
    
    return data || [];
  }
}
