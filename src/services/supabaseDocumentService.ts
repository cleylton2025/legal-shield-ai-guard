
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
    console.log('🚀 Enviando documento para processamento no servidor...');
    
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    // Criar FormData para envio
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));
    if (user) {
      formData.append('userId', user.id);
    }
    
    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: formData,
    });
    
    if (error) {
      console.error('❌ Erro no processamento:', error);
      throw new Error(`Erro no processamento: ${error.message}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido no processamento');
    }
    
    console.log('✅ Documento processado com sucesso:', data.summary);
    
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
      const { data, error } = await supabase.storage
        .from('documents')
        .download(downloadPath);
      
      if (error) {
        console.error('❌ Erro no download:', error);
        throw new Error(`Erro ao baixar arquivo: ${error.message}`);
      }
      
      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anonimizado_${originalFileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Download concluído');
    } catch (error) {
      console.error('❌ Erro no download:', error);
      throw error;
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
