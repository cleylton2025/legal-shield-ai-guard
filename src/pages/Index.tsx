
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
import { ProcessingOptions, ProcessingResult } from "@/utils/documentProcessor";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [anonymizationOptions, setAnonymizationOptions] = useState<ProcessingOptions>({
    cpf: "partial",
    names: "pseudonym",
    phones: "partial",
    emails: "partial",
    keepConsistency: true,
    preserveFormatting: true
  });

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setProcessingResult(null); // Reset previous results
    console.log("Arquivo selecionado:", file.name, file.size, file.type);
  };

  const handleProcessingComplete = (result: ProcessingResult) => {
    setProcessingResult(result);
    console.log("Processamento concluído:", result.summary);
  };

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
            options={anonymizationOptions}
            onProcessingComplete={handleProcessingComplete}
          />
          
          {processingResult && selectedFile && (
            <ProcessingResults 
              result={processingResult} 
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
