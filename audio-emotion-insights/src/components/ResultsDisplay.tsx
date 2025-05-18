
import React, { useEffect, useState } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ModelPrediction {
  model: string;
  emotion: string;
  confidence: number;
}

export interface EnsemblePrediction {
  emotion: string;
  confidence: number;
}

export interface AllProbabilities {
  [emotion: string]: number;
}

export interface AnalysisResult {
  individual_predictions: ModelPrediction[];
  ensemble_prediction: EnsemblePrediction;
  all_probabilities: AllProbabilities;
}

interface ResultsDisplayProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

const EmotionColors: Record<string, string> = {
  'happy': 'bg-emerald-400',
  'sad': 'bg-blue-400',
  'angry': 'bg-red-500',
  'fearful': 'bg-purple-400',
  'disgust': 'bg-lime-600',
  'surprised': 'bg-amber-400',
  'neutral': 'bg-gray-400',
  'calm': 'bg-teal-400'
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, isLoading }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      setVisible(true);
    }
  }, [result]);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 space-y-6">
        <div className="skeleton h-10 w-64 rounded-md mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="skeleton h-32 rounded-lg"></div>
          <div className="skeleton h-32 rounded-lg"></div>
          <div className="skeleton h-32 rounded-lg"></div>
        </div>
        <div className="skeleton h-64 rounded-lg"></div>
      </div>
    );
  }

  if (!result || !visible) {
    return null;
  }

  // Format confidence as percentage
  const formatConfidence = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Sort emotions by probability
  const sortedEmotions = Object.entries(result.all_probabilities)
    .sort((a, b) => b[1] - a[1]);

  // Get model friendly names
  const getModelName = (model: string): string => {
    const modelMapping: Record<string, string> = {
      'TESS': 'Toronto Emotional Speech Set',
      'RAVDESS': 'Ryerson Audio-Visual Database',
      'CREMA-D': 'Crowd-sourced Emotional Multimodal Actors Dataset'
    };
    return modelMapping[model] || model;
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 space-y-6 fade-in">
      <h2 className="text-2xl font-semibold text-center">Analysis Results</h2>
      
      {/* Ensemble Prediction - Main Result */}
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-xl">
            <CircleCheck className="mr-2 h-5 w-5 text-primary" />
            Final Prediction
          </CardTitle>
          <CardDescription>Combined result from all models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
            <div className="mb-4 sm:mb-0">
              <span className="text-3xl font-bold capitalize">
                {result.ensemble_prediction.emotion}
              </span>
              <div className="text-sm text-muted-foreground mt-1">
                Confidence: {formatConfidence(result.ensemble_prediction.confidence)}
              </div>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
              Ensemble Model
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Model Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {result.individual_predictions.map((prediction, index) => (
          <Card key={index} className="emotion-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md">{prediction.model}</CardTitle>
              <CardDescription className="text-xs">
                {getModelName(prediction.model)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-medium capitalize">{prediction.emotion}</div>
              <div className="text-sm text-muted-foreground">
                Confidence: {formatConfidence(prediction.confidence)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* All Probabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Emotion Probabilities</CardTitle>
          <CardDescription>Distribution of detected emotions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedEmotions.map(([emotion, probability], index) => (
              <div key={emotion} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{emotion}</span>
                  <span>{formatConfidence(probability)}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full progress-bar", 
                      `emotion-progress-${emotion.toLowerCase()}`,
                      EmotionColors[emotion] || 'bg-gray-400'
                    )}
                    style={{ 
                      transform: `scaleX(${probability})`,
                      transitionDelay: `${index * 100}ms` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsDisplay;
