
import { useState } from "react";
import { Play, Eye, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessingOptions } from "@/utils/documentProcessor";

interface ProcessingSectionProps {
  file: File | null;
  options: ProcessingOptions;
  onProcessingComplete: (processingId: string) => void;
}

const ProcessingSection = ({ 
  file, 
  options,
  onProcessingComplete
}: ProcessingSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

  const disabled = !file || !user;

  const handleProcess = async () => {
    if (!file || !user) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo e esteja logado.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);
    setProcessingResult(null);
    
    toast({
      title: "Iniciando processamento...",
      description: "Seu documento está sendo enviado para processamento seguro no servidor.",
    });

    try {
      console.log('🚀 Enviando arquivo para processamento server-side...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));
      formData.append('userId', user.id);

      const { data, error } = await supabase.functions.invoke('process-document', {
        body: formData,
      });

      if (error) {
        console.error('❌ Erro na função:', error);
        throw new Error(error.message || 'Erro na função do servidor');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha no processamento');
      }

      console.log('✅ Processamento concluído:', data);
      
      setProcessingResult(data);
      setIsComplete(true);
      onProcessingComplete(data.processingId);
      
      toast({
        title: "Sucesso!",
        description: data.message || "Documento processado com sucesso. Verifique o histórico para baixar.",
      });

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewHistory = () => {
    // Scroll para o histórico
    const historyElement = document.querySelector('[data-history-section]');
    if (historyElement) {
      historyElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Card className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full mr-3">
          <Play className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">3. Processe o documento</h3>
      </div>

      {!isComplete ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">
            Clique no botão abaixo para anonimizar seu documento com as configurações selecionadas.
            O processamento será feito em nosso servidor seguro para garantir máxima performance e segurança.
          </p>
          <Button
            onClick={handleProcess}
            disabled={disabled || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando no servidor...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Processar Documento
              </>
            )}
          </Button>
          {isProcessing && (
            <p className="text-sm text-gray-500 mt-4">
              O processamento está sendo realizado no servidor. Por favor, aguarde...
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">Documento processado com sucesso!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Todos os dados sensíveis foram anonimizados conforme suas configurações.
              O arquivo está disponível no histórico abaixo.
            </p>
            {processingResult?.summary && (
              <div className="mt-2 text-sm text-green-700">
                <strong>Padrões detectados:</strong> {processingResult.summary.totalPatterns} 
                (CPF: {processingResult.summary.cpfCount}, 
                Nomes: {processingResult.summary.nameCount}, 
                Telefones: {processingResult.summary.phoneCount}, 
                E-mails: {processingResult.summary.emailCount})
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleViewHistory}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Histórico e Baixar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProcessingSection;
