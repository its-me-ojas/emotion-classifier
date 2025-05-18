
import React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center">
      <Loader 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size],
          className
        )} 
      />
    </div>
  );
};

export default LoadingSpinner;
