
import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FileUpload from "@/components/FileUpload";
import AnonymizationConfig from "@/components/AnonymizationConfig";
import ProcessingSection from "@/components/ProcessingSection";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

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
    console.log("Arquivo selecionado:", file.name, file.size, file.type);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    console.log("Iniciando processamento com opções:", anonymizationOptions);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessed(true);
      setIsProcessing(false);
      
      toast({
        title: "Processamento concluído!",
        description: "Seu documento foi anonimizado com sucesso.",
      });
      
      console.log("Processamento concluído para:", selectedFile.name);
    }, 2000);
  };

  const handlePreview = () => {
    console.log("Visualizando preview do documento anonimizado");
    toast({
      title: "Preview",
      description: "Funcionalidade de preview será implementada em breve.",
    });
  };

  const handleDownload = () => {
    console.log("Fazendo download do documento anonimizado");
    toast({
      title: "Download iniciado",
      description: "O download do documento anonimizado começou.",
    });
    
    // Simulate download
    const link = document.createElement('a');
    link.href = '#';
    link.download = `anonimizado_${selectedFile?.name || 'documento.pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
