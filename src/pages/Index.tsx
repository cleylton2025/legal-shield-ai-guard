
import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FileUpload from "@/components/FileUpload";
import AnonymizationConfig from "@/components/AnonymizationConfig";
import ProcessingSection from "@/components/ProcessingSection";
import ProcessingResults from "@/components/ProcessingResults";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { DocumentProcessor, ProcessingResult } from "@/utils/documentProcessor";

interface AnonymizationOptions {
  cpf: string;
  names: string;
  phones: string;
  emails: string;
  keepConsistency: boolean;
  preserveFormatting: boolean;
}

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [anonymizationOptions, setAnonymizationOptions] = useState<AnonymizationOptions>({
    cpf: "partial",
    names: "pseudonym",
    phones: "partial",
    emails: "partial",
    keepConsistency: true,
    preserveFormatting: true
  });

  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setIsProcessed(false);
    setProcessingResult(null);
    console.log("Arquivo selecionado:", file.name, file.size, file.type);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    console.log("Iniciando processamento com opções:", anonymizationOptions);
    
    try {
      const result = await DocumentProcessor.processFile(selectedFile, anonymizationOptions);
      
      setProcessingResult(result);
      setIsProcessed(true);
      
      toast({
        title: "Processamento concluído!",
        description: `Documento anonimizado com sucesso. ${result.summary.totalPatterns} padrões detectados.`,
      });
      
      console.log("Processamento concluído:", result.summary);
    } catch (error) {
      console.error("Erro no processamento:", error);
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
      console.log("Mostrando preview do documento anonimizado");
    }
  };

  const handleDownload = () => {
    if (!processingResult || !selectedFile) return;
    
    console.log("Fazendo download do documento anonimizado no formato original");
    
    // Usar o arquivo processado se disponível, senão usar texto
    const fileToDownload = processingResult.processedFile || 
      new Blob([processingResult.anonymizedText], { type: 'text/plain' });
    
    const url = URL.createObjectURL(fileToDownload);
    
    // Determinar extensão baseada no formato original
    let extension = '.txt';
    if (processingResult.originalFormat === 'application/pdf') {
      extension = '.pdf';
    } else if (processingResult.originalFormat === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extension = '.docx';
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `anonimizado_${selectedFile.name.replace(/\.[^/.]+$/, "")}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download concluído",
      description: "O documento anonimizado foi baixado no formato original.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <HeroSection />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <FileUpload 
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
          
          <AnonymizationConfig
            options={anonymizationOptions}
            onChange={setAnonymizationOptions}
            disabled={!selectedFile}
          />
          
          <ProcessingSection
            file={selectedFile}
            isProcessed={isProcessed}
            onProcess={handleProcess}
            onPreview={handlePreview}
            onDownload={handleDownload}
            isProcessing={isProcessing}
          />
          
          {processingResult && selectedFile && (
            <ProcessingResults 
              result={processingResult} 
              fileName={selectedFile.name}
            />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
