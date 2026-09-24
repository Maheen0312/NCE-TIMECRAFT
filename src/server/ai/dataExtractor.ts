import { getGeminiClient } from './geminiClient';
import { ExtractedDataRecord } from '../../types/timetable';
import { Type } from '@google/genai';

export async function extractTimetableDataWithAI(
  inputText: string,
  department: string = 'Computer Science & Engineering'
): Promise<{ success: boolean; data?: ExtractedDataRecord[]; error?: string }> {
  if (!inputText || !inputText.trim()) {
    return { success: false, error: 'Please provide course data or text to extract.' };
  }

  // If Gemini API key is configured, try extraction with a 30-second timeout
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getGeminiClient();

      const prompt = `You are a data extraction engine for NCE Timecraft.
Extract structured academic course allocation records from the following unstructured or semi-structured curriculum/staff allocation text or CSV:

"${inputText.slice(0, 8000)}"

Target Department: ${department}

Extract every subject/course and its assigned faculty into the structured schema.
For subject types, map to "THEORY" or "LAB". Default weeklyHours: THEORY is usually 4, LAB is usually 2.
Generate clean uppercase short staffCode (e.g. "JT" for J. Tamilarsi, "RR" for R. Ramesh, "SK" for S. Karthik).`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI extraction timed out')), 30000)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Extract course and faculty allocation rows accurately. Preserve exact course codes and names.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjectName: { type: Type.STRING },
                subjectCode: { type: Type.STRING },
                staffName: { type: Type.STRING },
                staffCode: { type: Type.STRING },
                weeklyHours: { type: Type.NUMBER },
                type: { type: Type.STRING, description: 'THEORY or LAB' },
                department: { type: Type.STRING }
              },
              required: ['subjectName', 'subjectCode', 'staffName', 'staffCode', 'weeklyHours', 'type']
            }
          }
        }
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const parsed = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        const results: ExtractedDataRecord[] = parsed.map((item: any, idx: number) => ({
          id: `extracted_${Date.now()}_${idx}`,
          subjectName: item.subjectName || 'Untitled Course',
          subjectCode: (item.subjectCode || `CS${3000 + idx}`).toUpperCase(),
          staffName: item.staffName || 'Faculty Member',
          staffCode: (item.staffCode || 'FAC').toUpperCase(),
          weeklyHours: item.weeklyHours || (item.type === 'LAB' ? 2 : 4),
          type: item.type === 'LAB' ? 'LAB' : 'THEORY',
          department: item.department || department,
          status: 'PENDING'
        }));

        return { success: true, data: results };
      }
    } catch (error: any) {
      console.warn('Gemini extraction failed or timed out, falling back to heuristic parser:', error.message);
    }
  }

  // Intelligent fast local regex / CSV line parser fallback
  const lines = inputText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const fallbackResults: ExtractedDataRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip headers
    if (line.toLowerCase().includes('subject') && line.toLowerCase().includes('staff') && i === 0) continue;

    // Try split by comma, tab, pipe, or multiple spaces
    const parts = line.includes(',') 
      ? line.split(',').map(p => p.trim())
      : line.includes('\t')
      ? line.split('\t').map(p => p.trim())
      : line.includes('|')
      ? line.split('|').map(p => p.trim()).filter(Boolean)
      : line.split(/\s{2,}/).map(p => p.trim());

    if (parts.length >= 2) {
      const codeCandidate = parts.find(p => /^[A-Z]{2,4}\d{3,4}/i.test(p)) || `CS${3500 + i}`;
      const isLab = line.toLowerCase().includes('lab') || line.toLowerCase().includes('practical');
      const nameCandidate = parts.find(p => p !== codeCandidate && p.length > 3 && !/^[A-Z]{2,3}$/.test(p)) || 'Course Module';
      const staffCandidate = parts.find(p => p !== codeCandidate && p !== nameCandidate) || 'Faculty In-Charge';

      const initials = staffCandidate
        .replace(/^(dr\.|mr\.|mrs\.|prof\.)/i, '')
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || `F${i + 1}`;

      fallbackResults.push({
        id: `extracted_${Date.now()}_${i}`,
        subjectCode: codeCandidate.toUpperCase(),
        subjectName: nameCandidate,
        staffName: staffCandidate,
        staffCode: initials,
        weeklyHours: isLab ? 2 : 4,
        type: isLab ? 'LAB' : 'THEORY',
        department,
        status: 'PENDING'
      });
    }
  }

  if (fallbackResults.length > 0) {
    return { success: true, data: fallbackResults };
  }

  return {
    success: false,
    error: 'Could not extract course rows. Please check format (e.g. Course Code, Course Name, Faculty Name).'
  };
}

