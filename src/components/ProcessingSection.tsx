
import { useState } from "react";
import { Play, Eye, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProcessingSectionProps {
  file: File | null;
  isProcessed: boolean;
  onProcess: () => void;
  onPreview: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}

const ProcessingSection = ({ 
  file, 
  isProcessed, 
  onProcess, 
  onPreview, 
  onDownload,
  isProcessing 
}: ProcessingSectionProps) => {
  const { toast } = useToast();
  const disabled = !file;

  const handleProcess = () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo primeiro.",
        variant: "destructive",
      });
      return;
    }
    onProcess();
  };

  return (
    <Card className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full mr-3">
          <Play className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">3. Processe o documento</h3>
      </div>

      {!isProcessed ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">
            Clique no botão abaixo para anonimizar seu documento com as configurações selecionadas.
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
              Todos os dados sensíveis foram anonimizados conforme suas configurações.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onPreview}
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Preview
            </Button>
            <Button
              onClick={onDownload}
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
