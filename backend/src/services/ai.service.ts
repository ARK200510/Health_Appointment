import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AILogStatus } from '@prisma/client';

const PRE_VISIT_PROMPT = `You are a medical triage assistant. Analyze the patient symptoms and respond ONLY with valid JSON (no markdown):
{
  "urgencyLevel": "low|medium|high|critical",
  "chiefComplaint": "string",
  "riskFactors": ["string"],
  "suggestedDepartment": "string",
  "doctorQuestions": ["question1", "question2", "question3"],
  "recommendedTests": ["test1"],
  "redFlags": ["flag1"],
  "confidenceScore": 0.0-1.0
}`;

const POST_VISIT_PROMPT = `Convert the doctor's clinical notes into patient-friendly information. Respond ONLY with valid JSON:
{
  "simpleExplanation": "string in simple English",
  "diagnosis": "string",
  "medicationSchedule": [{"name": "", "dosage": "", "timing": ""}],
  "foodAdvice": "string",
  "exerciseAdvice": "string",
  "thingsToAvoid": "string",
  "warningSigns": "string",
  "followUpDate": "YYYY-MM-DD or null",
  "emergencyInstructions": "string"
}`;

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  private getClient() {
    if (!config.gemini.apiKey) {
      return null;
    }
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
    return this.genAI;
  }

  async analyzeSymptoms(appointmentId: string, symptomId: string, description: string) {
    const inputData = description;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.gemini.maxRetries; attempt++) {
      try {
        const result = await this.callGemini(
          `${PRE_VISIT_PROMPT}\n\nPatient Symptoms:\n${description}`
        );

        const parsed = JSON.parse(this.extractJson(result));

        const summary = await prisma.aISummary.create({
          data: {
            appointmentId,
            symptomId,
            type: 'PRE_VISIT',
            inputData,
            outputData: parsed,
            urgencyLevel: parsed.urgencyLevel,
            chiefComplaint: parsed.chiefComplaint,
            riskFactors: parsed.riskFactors || [],
            suggestedDept: parsed.suggestedDepartment,
            doctorQuestions: parsed.doctorQuestions || [],
            recommendedTests: parsed.recommendedTests || [],
            redFlags: parsed.redFlags || [],
            confidenceScore: parsed.confidenceScore,
            status: AILogStatus.SUCCESS,
            retryCount: attempt,
          },
        });

        return summary;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('AI analysis failed');
        if (attempt < config.gemini.maxRetries - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    const fallback = await prisma.aISummary.create({
      data: {
        appointmentId,
        symptomId,
        type: 'PRE_VISIT',
        inputData,
        status: AILogStatus.MANUAL_FALLBACK,
        errorMessage: lastError?.message,
        retryCount: config.gemini.maxRetries,
        outputData: {
          message: 'AI analysis unavailable. Doctor will review symptoms manually.',
          urgencyLevel: 'medium',
          chiefComplaint: description.slice(0, 200),
        },
      },
    });

    return fallback;
  }

  async generatePostVisitSummary(appointmentId: string, clinicalNotes: string) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.gemini.maxRetries; attempt++) {
      try {
        const result = await this.callGemini(
          `${POST_VISIT_PROMPT}\n\nClinical Notes:\n${clinicalNotes}`
        );

        const parsed = JSON.parse(this.extractJson(result));

        const summary = await prisma.aISummary.create({
          data: {
            appointmentId,
            type: 'POST_VISIT',
            inputData: clinicalNotes,
            outputData: parsed,
            simpleExplanation: parsed.simpleExplanation,
            diagnosis: parsed.diagnosis,
            medicationSchedule: parsed.medicationSchedule,
            foodAdvice: parsed.foodAdvice,
            exerciseAdvice: parsed.exerciseAdvice,
            thingsToAvoid: parsed.thingsToAvoid,
            warningSigns: parsed.warningSigns,
            followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
            emergencyInstructions: parsed.emergencyInstructions,
            status: AILogStatus.SUCCESS,
            retryCount: attempt,
          },
        });

        return summary;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('AI summary failed');
        if (attempt < config.gemini.maxRetries - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    return prisma.aISummary.create({
      data: {
        appointmentId,
        type: 'POST_VISIT',
        inputData: clinicalNotes,
        status: AILogStatus.MANUAL_FALLBACK,
        errorMessage: lastError?.message,
        retryCount: config.gemini.maxRetries,
        simpleExplanation: 'Your visit summary is being prepared by your doctor.',
        outputData: { originalNotes: clinicalNotes },
      },
    });
  }

  private async callGemini(prompt: string): Promise<string> {
    const client = this.getClient();
    if (!client) {
      throw new AppError(503, 'AI service not configured');
    }

    const model = client.getGenerativeModel({ model: config.gemini.model });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) throw new Error('Empty AI response');
    return text;
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');
    return match[0];
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiService = new AIService();
