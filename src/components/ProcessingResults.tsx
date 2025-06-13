
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcessingResult } from "@/utils/documentProcessor";
import { Eye, FileText, Shield, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ProcessingInfo from "./ProcessingInfo";

interface ProcessingResultsProps {
  result: ProcessingResult;
  fileName: string;
}

const ProcessingResults = ({ result, fileName }: ProcessingResultsProps) => {
  const [showPreview, setShowPreview] = useState(false);

  const { summary, detectedPatterns, anonymizationResults, originalText, anonymizedText, originalFormat, processedFile } = result;

  return (
    <div className="space-y-6">
      <ProcessingInfo 
        originalFormat={originalFormat}
        fileName={fileName}
        hasProcessedFile={!!processedFile}
      />
      
      <Card className="p-6">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full mr-3">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-semibold">Resultados do Processamento</h3>
        </div>

        {/* Resumo estatístico */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalPatterns}</div>
            <div className="text-sm text-blue-700">Total de Padrões</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{summary.cpfCount}</div>
            <div className="text-sm text-red-700">CPFs</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.nameCount}</div>
            <div className="text-sm text-purple-700">Nomes</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{summary.phoneCount}</div>
            <div className="text-sm text-green-700">Telefones</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.emailCount}</div>
            <div className="text-sm text-yellow-700">E-mails</div>
          </div>
        </div>

        {/* Padrões detectados */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Dados Anonimizados
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {anonymizationResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {result.technique.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-600 font-mono">
                    {result.original.length > 30 ? `${result.original.substring(0, 30)}...` : result.original}
                  </span>
                </div>
                <span className="text-sm text-green-600 font-mono">
                  {result.anonymized.length > 20 ? `${result.anonymized.substring(0, 20)}...` : result.anonymized}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview do documento */}
        <div className="border-t pt-4">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            className="mb-4"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Ocultar' : 'Mostrar'} Preview do Documento
          </Button>

          {showPreview && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Documento Original
                </h5>
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {originalText.substring(0, 1000)}
                    {originalText.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
              <div>
                <h5 className="font-medium mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Documento Anonimizado
                </h5>
                <div className="bg-green-50 border border-green-200 p-3 rounded text-sm max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {anonymizedText.substring(0, 1000)}
                    {anonymizedText.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProcessingResults;
