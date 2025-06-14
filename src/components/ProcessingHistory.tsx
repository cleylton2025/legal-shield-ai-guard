
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Download, Eye, Clock } from "lucide-react";
import { SupabaseDocumentService } from "@/services/supabaseDocumentService";
import { useToast } from "@/hooks/use-toast";

interface ProcessingRecord {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: string;
  processing_summary: any;
  created_at: string;
  completed_at: string;
  processed_storage_path: string;
}

const ProcessingHistory = () => {
  const [history, setHistory] = useState<ProcessingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await SupabaseDocumentService.getProcessingHistory();
      setHistory(data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record: ProcessingRecord) => {
    try {
      await SupabaseDocumentService.downloadProcessedFile(
        record.processed_storage_path,
        record.original_filename
      );
      
      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado...",
      });
    } catch (error) {
      console.error("Erro no download:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleViewLogs = async (processingId: string) => {
    try {
      const logs = await SupabaseDocumentService.getProcessingLogs(processingId);
      setSelectedLogs(logs);
      setShowLogs(processingId);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processando</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Carregando histórico...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full mr-3">
          <History className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">Histórico de Processamentos</h3>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhum processamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{record.original_filename}</span>
                  {getStatusBadge(record.status)}
                </div>
                <div className="flex items-center space-x-2">
                  {record.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(record)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewLogs(record.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Logs
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Tamanho:</span> {formatFileSize(record.file_size)}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {record.file_type}
                </div>
                <div>
                  <span className="font-medium">Criado:</span> {new Date(record.created_at).toLocaleString('pt-BR')}
                </div>
                {record.completed_at && (
                  <div>
                    <span className="font-medium">Concluído:</span> {new Date(record.completed_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              
              {record.processing_summary && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Padrões detectados:</span> {record.processing_summary.totalPatterns} 
                  (CPF: {record.processing_summary.cpfCount}, 
                  Nomes: {record.processing_summary.nameCount}, 
                  Telefones: {record.processing_summary.phoneCount}, 
                  E-mails: {record.processing_summary.emailCount})
                </div>
              )}

              {showLogs === record.id && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Logs de Processamento
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedLogs.map((log, index) => (
                      <div key={index} className="text-xs">
                        <span className="text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className={`ml-2 px-1 rounded text-white text-xs ${
                          log.log_level === 'error' ? 'bg-red-500' :
                          log.log_level === 'warning' ? 'bg-yellow-500' :
                          log.log_level === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}>
                          {log.log_level.toUpperCase()}
                        </span>
                        <span className="ml-2">{log.message}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setShowLogs(null)}
                  >
                    Fechar Logs
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ProcessingHistory;
