
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FileUpload from "@/components/FileUpload";
import AnonymizationConfig from "@/components/AnonymizationConfig";
import ProcessingSection from "@/components/ProcessingSection";
import ProcessingResults from "@/components/ProcessingResults";
import ProcessingHistory from "@/components/ProcessingHistory";
import Footer from "@/components/Footer";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SupabaseDocumentService, ProcessingResult } from "@/services/supabaseDocumentService";

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

  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setIsProcessed(false);
    setProcessingResult(null);
    console.log("Arquivo selecionado:", file.name, file.size, file.type);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    console.log("🚀 Iniciando processamento com Supabase...");
    
    try {
      const result = await SupabaseDocumentService.processDocument(selectedFile, anonymizationOptions);
      
      setProcessingResult(result);
      setIsProcessed(true);
      
      toast({
        title: "Processamento concluído!",
        description: `Documento anonimizado com sucesso. ${result.summary.totalPatterns} padrões detectados.`,
      });
      
      console.log("✅ Processamento concluído:", result.summary);
    } catch (error) {
      console.error("❌ Erro no processamento:", error);
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
      console.log("👁️ Mostrando preview do documento anonimizado");
      // Preview já é mostrado no ProcessingResults
    }
  };

  const handleDownload = async () => {
    if (!processingResult || !selectedFile) return;
    
    try {
      await SupabaseDocumentService.downloadProcessedFile(
        processingResult.downloadPath,
        selectedFile.name
      );
      
      toast({
        title: "Download concluído",
        description: "O documento anonimizado foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro no download:", error);
      toast({
        title: "Erro no download",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Convert ProcessingResult para o formato esperado pelo ProcessingResults
  const processingResultForDisplay = processingResult ? {
    originalText: processingResult.originalText,
    anonymizedText: processingResult.anonymizedText,
    detectedPatterns: processingResult.detectedPatterns,
    anonymizationResults: [], // Não usado no componente atual
    originalFormat: selectedFile?.type || 'text/plain',
    summary: processingResult.summary
  } : null;

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center p-4">
        <Header />
        <AuthButton />
      </div>
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
          
          {processingResultForDisplay && selectedFile && (
            <ProcessingResults 
              result={processingResultForDisplay} 
              fileName={selectedFile.name}
            />
          )}

          <ProcessingHistory />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
