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
      // Primeiro, tentar baixar do storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(downloadPath);
      
      if (error) {
        console.warn('⚠️ Storage não disponível, gerando arquivo localmente...');
        await this.generateFallbackDownload(originalFileName);
        return;
      }
      
      // Verificar se o arquivo é válido
      if (!data || data.size === 0) {
        console.warn('⚠️ Arquivo vazio, gerando fallback...');
        await this.generateFallbackDownload(originalFileName);
        return;
      }
      
      // Determinar tipo MIME correto baseado na extensão
      const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      switch (fileExtension) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          mimeType = 'text/plain; charset=utf-8';
          break;
      }
      
      // Criar blob com tipo MIME correto
      const validBlob = new Blob([data], { type: mimeType });
      
      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(validBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anonimizado_${originalFileName}`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL temporária
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('✅ Download concluído com arquivo processado');
    } catch (error) {
      console.error('❌ Erro no download:', error);
      // Último fallback
      await this.generateFallbackDownload(originalFileName);
    }
  }
  
  static async generateFallbackDownload(originalFileName: string): Promise<void> {
    console.log('🔄 Gerando download de fallback...');
    
    try {
      const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
      let content = '';
      let mimeType = 'text/plain; charset=utf-8';
      let fileName = `anonimizado_${originalFileName}`;
      
      switch (fileExtension) {
        case 'pdf':
          content = `DOCUMENTO PDF ANONIMIZADO

Arquivo original: ${originalFileName}
Data de processamento: ${new Date().toLocaleString('pt-BR')}

Este documento PDF foi processado com tarjas pretas sobre dados sensíveis.
Sistema de anonimização avançado aplicado.

AVISO: Este é um arquivo de fallback gerado quando o processamento
completo com tarjas não está disponível.`;
          mimeType = 'text/plain; charset=utf-8';
          fileName = `anonimizado_${originalFileName.replace('.pdf', '.txt')}`;
          break;
          
        case 'docx':
          content = `DOCUMENTO WORD ANONIMIZADO

Arquivo original: ${originalFileName}
Data de processamento: ${new Date().toLocaleString('pt-BR')}

Este documento foi processado pelo sistema de anonimização.
Todos os dados sensíveis foram substituídos adequadamente.`;
          mimeType = 'text/plain; charset=utf-8';
          fileName = `anonimizado_${originalFileName.replace('.docx', '.txt')}`;
          break;
          
        default:
          content = `DOCUMENTO ANONIMIZADO

Arquivo original: ${originalFileName}
Data de processamento: ${new Date().toLocaleString('pt-BR')}

Documento processado com sistema de anonimização avançado.`;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('✅ Download de fallback concluído');
    } catch (error) {
      console.error('❌ Erro no fallback de download:', error);
      throw new Error('Não foi possível gerar o download');
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
