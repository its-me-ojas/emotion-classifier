
import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { AlertCircle, FileAudio, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadAreaProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ 
  onFileSelected,
  isLoading
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const validateFile = (file: File) => {
    setError(null);
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.wav')) {
      setError('Please upload a .wav file only');
      return false;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return false;
    }
    
    return true;
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };
  
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };
  
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "upload-area w-full max-w-md mx-auto p-8 border-2 border-dashed rounded-lg text-center transition-all",
        isDragging ? "border-primary bg-primary/5" : "border-gray-300",
        isLoading ? "opacity-50 pointer-events-none" : ""
      )}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="bg-primary/10 p-4 rounded-full">
          {isDragging ? (
            <FileAudio className="h-10 w-10 text-primary" />
          ) : (
            <Upload className="h-10 w-10 text-primary" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Upload Audio File</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop a .wav file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: 10MB
          </p>
        </div>
        
        {error && (
          <div className="flex items-center space-x-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isLoading}
        />
        
        <Button 
          onClick={handleButtonClick}
          disabled={isLoading}
          variant="outline"
          className="mt-2"
        >
          <FileAudio className="h-4 w-4 mr-2" />
          Select WAV File
        </Button>
      </div>
    </div>
  );
};

export default FileUploadArea;
