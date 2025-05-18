
import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from 'lucide-react';
import FileUploadArea from '@/components/FileUploadArea';
import ResultsDisplay, { AnalysisResult } from '@/components/ResultsDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import { analyzeAudio } from '@/services/api';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeAudio(file);
      setAnalysisResult(result);
      
      toast({
        title: "Analysis Complete",
        description: `Detected primary emotion: ${result.ensemble_prediction.emotion}`,
      });
    } catch (error) {
      console.error('Error during analysis:', error);
      
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        action: (
          <div className="h-8 w-8 bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-destructive-foreground" />
          </div>
        ),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <header className="w-full py-8 text-center bg-white border-b">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-primary">Audio Emotion Analysis</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Upload a speech recording to detect emotions through advanced ML models
          </p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 flex-1">
        <div className="flex flex-col items-center space-y-8">
          {/* File Upload Area */}
          {(!analysisResult || isAnalyzing) && (
            <div className="w-full max-w-md">
              <FileUploadArea 
                onFileSelected={handleFileSelected} 
                isLoading={isAnalyzing} 
              />
            </div>
          )}
          
          {/* Loading State */}
          {isAnalyzing && (
            <div className="text-center py-8">
              <LoadingSpinner size="large" className="mb-4" />
              <p className="text-muted-foreground">Analyzing audio...</p>
              {selectedFile && (
                <p className="text-xs mt-2 text-muted-foreground">
                  File: {selectedFile.name}
                </p>
              )}
            </div>
          )}
          
          {/* Results Display */}
          <ResultsDisplay result={analysisResult} isLoading={isAnalyzing} />
          
          {/* Reset Button */}
          {analysisResult && !isAnalyzing && (
            <button 
              onClick={() => {
                setSelectedFile(null);
                setAnalysisResult(null);
              }}
              className="mt-8 text-sm text-primary hover:text-primary/80 underline"
            >
              Analyze another audio file
            </button>
          )}
        </div>
      </main>
      
      <footer className="w-full py-4 border-t bg-white/50">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Speech Emotion Recognition System</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
