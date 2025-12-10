export enum ViewState {
  HOME = 'HOME',
  UPLOAD = 'UPLOAD',
  DIAGNOSE = 'DIAGNOSE',
  PLAN = 'PLAN',
}

export interface ExtractedTopic {
  name: string;
  concepts: string[];
}

export interface AnalysisResult {
  formattedAnalysis: string; // The user-requested markdown summary
  subjects: string[];
  topics: ExtractedTopic[];
  rawText: string;
}

export interface Question {
  id: string;
  text: string;
  hint: string;
}

export interface DiagnosisResult {
  formattedDiagnosis: string; // The detailed markdown diagnosis
  weakTopics: string[];
  strongTopics: string[];
  feedback: string;
}

export interface DailyPlan {
  day: number;
  focus: string;
  tasks: string[];
}

export interface StudyPlanResult {
  formattedPlan: string; // The detailed markdown plan
  schedule: DailyPlan[];
  todayFocus: string;
  summary: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  answer: string; // Short correct answer
  hint: string;
  solution: string; // Detailed step-by-step
}

export interface QuizEvaluation {
  formattedEvaluation: string; // The AI Coach's markdown review
}