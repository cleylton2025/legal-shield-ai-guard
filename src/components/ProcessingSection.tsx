
import { useState } from "react";
import { Play, Eye, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DocumentProcessor, ProcessingOptions, ProcessingResult } from "@/utils/documentProcessor";

interface ProcessingSectionProps {
  file: File | null;
  onProcess: (result: ProcessingResult) => void;
  options: ProcessingOptions;
}

const ProcessingSection = ({ 
  file, 
  onProcess,
  options
}: ProcessingSectionProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  const disabled = !file;

  const handleProcess = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🚀 Starting file processing with advanced PDF redaction...');
      const result = await DocumentProcessor.processFile(file, options);
      setProcessingResult(result);
      onProcess(result);
      
      toast({
        title: "Sucesso!",
        description: "Documento processado com sucesso. Use os botões abaixo para visualizar ou baixar.",
      });
    } catch (error) {
      console.error('❌ Processing error:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = () => {
    if (processingResult) {
      onProcess(processingResult);
    }
  };

  const handleDownload = () => {
    if (!processingResult?.processedFile) {
      toast({
        title: "Erro",
        description: "Arquivo processado não disponível.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = URL.createObjectURL(processingResult.processedFile);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension based on original format
      let extension = 'txt';
      if (processingResult.originalFormat === 'application/pdf') {
        extension = 'pdf';
      } else if (processingResult.originalFormat === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extension = 'txt'; // DOCX becomes text for now
      }
      
      const originalName = file?.name.split('.').slice(0, -1).join('.') || 'documento';
      link.download = `anonimizado_${originalName}.${extension}`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      toast({
        title: "Download iniciado",
        description: "O arquivo anonimizado está sendo baixado.",
      });
    } catch (error) {
      console.error('❌ Download error:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
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

      {!processingResult ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">
            Clique no botão abaixo para anonimizar seu documento com as configurações selecionadas.
            {file?.type === 'application/pdf' && (
              <span className="block mt-2 text-sm text-blue-600">
                📄 PDFs serão processados com tarjas pretas sobre dados sensíveis.
              </span>
            )}
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
                Processando...
              </>
            ) : (
              <>
                <Eye className="h-5 w-5 mr-2" />
                Processar Documento
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-800 font-medium">Documento processado com sucesso!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              {file?.type === 'application/pdf' 
                ? 'PDF processado com tarjas pretas sobre dados sensíveis.'
                : 'Todos os dados sensíveis foram anonimizados conforme suas configurações.'
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Preview
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Anonimizado
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProcessingSection;
