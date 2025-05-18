import { AnalysisResult } from '@/components/ResultsDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Uploads an audio file for emotion analysis
 * @param file Audio file to be analyzed
 * @returns Promise with analysis results
 */
export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing audio:', error);
    throw error;
  }
}
