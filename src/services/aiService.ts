import { Timetable, ValidationResult, Subject, StaffProfile, Room, AiTimetableSuggestion, AiAnalysisResult, ExtractedDataRecord, ExtractedTimetableImageResult } from '../types/timetable';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestion?: AiTimetableSuggestion;
}

export async function askAiAssistant(params: {
  message: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  timetable: Timetable;
  validation?: ValidationResult;
  subjects?: Subject[];
  staff?: StaffProfile[];
  rooms?: Room[];
}): Promise<{ success: boolean; message: string; suggestion?: AiTimetableSuggestion | null }> {
  try {
    const response = await fetch('/api/ai/timetable-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error calling AI assistant:', error);
    return {
      success: false,
      message: 'Failed to contact AI Assistant. Please verify server connection.',
      suggestion: null,
    };
  }
}

export async function analyzeTimetableWithAI(params: {
  timetable: Timetable;
  validation?: ValidationResult;
  subjects?: Subject[];
  staff?: StaffProfile[];
  rooms?: Room[];
}): Promise<{ success: boolean; analysis?: AiAnalysisResult; error?: string }> {
  try {
    const response = await fetch('/api/ai/analyze-timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error analyzing timetable with AI:', error);
    return {
      success: false,
      error: error.message || 'AI analysis request failed.',
    };
  }
}

export async function extractCurriculumDataWithAI(params: {
  text: string;
  department?: string;
}): Promise<{ success: boolean; data?: ExtractedDataRecord[]; error?: string }> {
  try {
    const response = await fetch('/api/ai/extract-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error extracting curriculum data:', error);
    return {
      success: false,
      error: error.message || 'AI Data extraction failed.',
    };
  }
}

export async function extractTimetableFromImageWithAI(params: {
  imageBase64: string;
  mimeType?: string;
  department?: string;
  year?: string;
  semester?: string;
}): Promise<{ success: boolean; data?: ExtractedTimetableImageResult; error?: string }> {
  try {
    const response = await fetch('/api/ai/extract-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error extracting timetable from image:', error);
    return {
      success: false,
      error: error.message || 'AI Image Extraction failed.',
    };
  }
}
