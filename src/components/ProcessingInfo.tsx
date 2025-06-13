
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Download } from "lucide-react";

interface ProcessingInfoProps {
  originalFormat: string;
  fileName: string;
  hasProcessedFile: boolean;
}

const ProcessingInfo = ({ originalFormat, fileName, hasProcessedFile }: ProcessingInfoProps) => {
  const getFormatInfo = (format: string) => {
    switch (format) {
      case 'application/pdf':
        return {
          name: 'PDF',
          method: 'Redação com tarjas pretas',
          icon: <FileText className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800'
        };
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return {
          name: 'DOCX',
          method: 'Substituição de texto',
          icon: <FileText className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          name: 'TXT',
          method: 'Substituição de texto',
          icon: <FileText className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatInfo = getFormatInfo(originalFormat);

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full">
          <Shield className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-blue-900">Método de Anonimização:</span>
            <Badge className={formatInfo.color}>
              {formatInfo.icon}
              <span className="ml-1">{formatInfo.name}</span>
            </Badge>
          </div>
          <p className="text-sm text-blue-700">{formatInfo.method}</p>
          {hasProcessedFile && (
            <div className="flex items-center mt-2 text-xs text-blue-600">
              <Download className="h-3 w-3 mr-1" />
              Arquivo será baixado no formato original
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProcessingInfo;
