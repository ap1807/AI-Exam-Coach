import { GoogleGenAI, Schema, Type } from "@google/genai";
import { 
  AnalysisResult, 
  Question, 
  DiagnosisResult, 
  StudyPlanResult, 
  QuizQuestion, 
  QuizEvaluation 
} from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// We strictly use Gemini 3 Pro as requested
const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Uploads notes (text or base64 files) and extracts topics.
 */
export const analyzeNotes = async (
  textInput: string, 
  file: { data: string; mimeType: string } | null
): Promise<AnalysisResult> => {
  
  const systemInstruction = `
    You are an AI Exam Coach helping a student prepare for exams.
    The student will give you raw study notes.
    
    Your job is to convert these messy notes into a clean, structured study summary.

    DO THIS STEP BY STEP:
    1. Identify the main SUBJECT and CHAPTER (if possible).
    2. Extract the main TOPICS covered.
    3. Extract KEY CONCEPTS for each topic.
    4. Extract IMPORTANT FORMULAS or DEFINITIONS.
    5. Suggest 3–5 FOCUS AREAS the student should prioritize while revising.

    VERY IMPORTANT OUTPUT FORMAT for the "formattedAnalysis" field:
    Return the result in clear Markdown with EXACTLY these sections:

    # Subject and Chapter
    (1–2 lines)

    # Topics
    - Topic 1
    - Topic 2
    - Topic 3

    # Key Concepts
    - Concept 1: short explanation
    - Concept 2: short explanation

    # Important Formulas or Definitions
    - Formula/Definition 1: short meaning or usage
    - Formula/Definition 2: short meaning or usage

    # Suggested Focus Areas
    - Focus Area 1 (reason why)
    - Focus Area 2 (reason why)
    - Focus Area 3 (reason why)

    Keep the language simple and student-friendly.
    Do NOT invent topics that clearly are not present in the notes.
    Use only the information from the notes plus reasonable inference.
  `;

  const prompt = `
    Analyze the provided notes and return a JSON object containing:
    1. "formattedAnalysis": The study summary following the specific Markdown format above.
    2. "subjects": A list of detected subject names for the app's internal use.
    3. "topics": A structured list of topics and their concepts for the app's internal use.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (textInput) {
    parts.push({ text: `Student Text Notes:\n${textInput}` });
  }

  if (file) {
    parts.push({
      inlineData: {
        data: file.data,
        mimeType: file.mimeType
      }
    });
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      formattedAnalysis: { 
        type: Type.STRING, 
        description: "The analysis result formatted in Markdown with the exact sections requested." 
      },
      subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
      topics: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Topic Name" },
            concepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key concepts or formulas" }
          },
          required: ["name", "concepts"]
        }
      }
    },
    required: ["formattedAnalysis", "subjects", "topics"]
  };

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  const parsed = JSON.parse(result.text || "{}");
  
  return {
    formattedAnalysis: parsed.formattedAnalysis || "Analysis failed to generate text.",
    subjects: parsed.subjects || [],
    topics: parsed.topics || [],
    rawText: textInput
  };
};

/**
 * Generates diagnostic questions based on topics.
 */
export const generateDiagnosticTest = async (subject: string, topics: string[]): Promise<Question[]> => {
  const prompt = `
    Create a diagnostic test for the subject: ${subject}.
    Focus on these detected topics: ${topics.join(', ')}.
    Generate 3 to 5 open-ended conceptual questions to test understanding.
    Provide a small hint for each question.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        text: { type: Type.STRING, description: "The question text" },
        hint: { type: Type.STRING, description: "A subtle hint" }
      },
      required: ["id", "text", "hint"]
    }
  };

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  return JSON.parse(result.text || "[]");
};

/**
 * Analyzes the student's answers to the diagnostic test.
 */
export const evaluateDiagnostic = async (
  subject: string,
  qaPairs: { question: string; answer: string }[],
  topics: string[]
): Promise<DiagnosisResult> => {
  const prompt = `
    You are an expert AI Exam Coach.

    The student has just completed a diagnostic test.
    Subject: ${subject}
    Topics Covered: ${topics.join(', ')}
    
    Q&A Data:
    ${JSON.stringify(qaPairs)}

    DO THE FOLLOWING ANALYSIS:

    1. Identify which TOPICS the student is STRONG in.
    2. Identify which TOPICS the student is WEAK in.
    3. Detect the TYPE of mistakes:
       - Conceptual misunderstanding
       - Formula/application mistake
       - Calculation or careless error
    4. Identify:
       - The SINGLE MOST IMPORTANT WEAK AREA to fix first
       - The reason why this weak area is critical

    5. Suggest:
       - 2–3 very focused improvement actions for the next 24 hours

    VERY IMPORTANT OUTPUT FORMAT for the "formattedDiagnosis" field:
    Return exactly in the following Markdown structure:

    # Strength Areas
    - Topic 1 (why student is strong)
    - Topic 2 (why student is strong)

    # Weak Areas
    - Topic 1 (exact mistake pattern)
    - Topic 2 (exact mistake pattern)

    # Error Pattern Summary
    - Primary error type:
    - Secondary error type:

    # Highest Priority Fix
    - Topic:
    - Why this should be fixed first:

    # What The Student Should Do Next (Next 24 Hours)
    1. Action 1
    2. Action 2
    3. Action 3

    Keep the feedback:
    - Honest
    - Clear
    - Encouraging
    - Student-friendly
    
    Additionally, extract "weakTopics" and "strongTopics" as arrays for the app's internal logic.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      formattedDiagnosis: { type: Type.STRING, description: "The deep diagnosis in Markdown format" },
      weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      strongTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      feedback: { type: Type.STRING, description: "Short summary feedback" }
    },
    required: ["formattedDiagnosis", "weakTopics", "strongTopics", "feedback"]
  };

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  return JSON.parse(result.text || "{}");
};

/**
 * Generates a study plan based on weak areas.
 */
export const generateStudyPlan = async (
  weakTopics: string[],
  strongTopics: string[],
  hoursPerDay: number,
  daysUntilExam: number
): Promise<StudyPlanResult> => {
  const prompt = `
    You are an expert AI Exam Strategist.

    You are given:
    - Weak topics: ${weakTopics.join(', ')}
    - Strong topics: ${strongTopics.join(', ')}
    - Hours available per day: ${hoursPerDay}
    - Total days until exam: ${daysUntilExam}

    Your job is to generate a smart, exam-optimized study plan.

    PLANNING RULES (VERY IMPORTANT):
    1. Weak topics must be scheduled FIRST.
    2. Every day must include:
       - New learning
       - Short revision
       - Practice questions
    3. Use spaced repetition logic:
       - Revisit weak topics after 2–3 days.
    4. Do NOT overload any single day.
    5. Assume the student has limited mental energy.
    6. Reserve the last 20% of days mainly for full revision & mock tests.

    Generate a JSON response containing:

    1. "formattedPlan": A string in EXACTLY this Markdown format:

      # 7-Day Smart Study Plan (or fewer if exam is sooner)

      ## Day 1
      - Topics:
      - Time Split:
      - Goal:

      ## Day 2
      - Topics:
      - Time Split:
      - Goal:

      ...

      # Long-Term Strategy (Till Exam)

      - Phase 1 (days X–Y):
      - Phase 2 (days X–Y):
      - Phase 3 (days X–Y):

    2. "todayFocus": The main topic for Day 1 (to be used internally for generating the daily quiz).
    3. "schedule": A simple array for internal logic (optional but good to have) containing the focus topic for each day.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      formattedPlan: { type: Type.STRING, description: "The detailed plan in Markdown format" },
      todayFocus: { type: Type.STRING, description: "The main focus topic for Day 1" },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER },
            focus: { type: Type.STRING },
            tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["day", "focus", "tasks"]
        }
      },
      summary: { type: Type.STRING }
    },
    required: ["formattedPlan", "todayFocus", "schedule", "summary"]
  };

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  return JSON.parse(result.text || "{}");
};

/**
 * Generates a daily quiz with solutions using a custom text format.
 */
export const generateDailyQuiz = async (focusTopic: string, weakTopics: string[]): Promise<QuizQuestion[]> => {
  const prompt = `
    You are an expert AI teacher creating an adaptive quiz for a student.

    You are given:
    - Today's study topics: ${focusTopic}
    - The student's known weak areas: ${weakTopics.join(', ') || 'None specifically'}

    Your job:
    Generate 3–5 exam-quality questions that:
    1. Focus MORE on the student's weak topics (if relevant to today's topic).
    2. Include a mix of:
       - Conceptual questions
       - Numerical or application-based questions
    3. Are at a medium to slightly challenging level.

    For EACH question, return:
    - The question
    - The correct answer
    - A small HINT (not the full solution)
    - A full STEP-BY-STEP SOLUTION

    VERY IMPORTANT OUTPUT FORMAT:
    Return the result in EXACTLY this structure:

    # Question 1
    - Question: [Question Text]
    - Correct Answer: [Short Answer]
    - Hint: [Hint Text]
    - Step-by-Step Solution: [Detailed Solution]

    # Question 2
    - Question: ...
    - Correct Answer: ...
    - Hint: ...
    - Step-by-Step Solution: ...

    (repeat for all questions)

    Do NOT include extra text outside this format.
  `;

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    // We request text/plain to follow the user's specific formatting prompt strictly,
    // then we parse it into the application structure.
    config: {
      responseMimeType: "text/plain",
    }
  });

  const text = result.text || "";
  const questions: QuizQuestion[] = [];
  
  // Robust parsing of the custom text format
  const chunks = text.split(/# Question \d+/).slice(1);
  
  for (const chunk of chunks) {
    const questionMatch = chunk.match(/- Question:\s*([\s\S]*?)(?=\n- Correct Answer:|$)/);
    const answerMatch = chunk.match(/- Correct Answer:\s*([\s\S]*?)(?=\n- Hint:|$)/);
    const hintMatch = chunk.match(/- Hint:\s*([\s\S]*?)(?=\n- Step-by-Step Solution:|$)/);
    const solutionMatch = chunk.match(/- Step-by-Step Solution:\s*([\s\S]*?)(?=$)/);
    
    if (questionMatch) {
      questions.push({
         id: crypto.randomUUID(),
         question: questionMatch[1].trim(),
         answer: answerMatch ? answerMatch[1].trim() : '',
         hint: hintMatch ? hintMatch[1].trim() : '',
         solution: solutionMatch ? solutionMatch[1].trim() : ''
      });
    }
  }

  return questions;
};

/**
 * Grades the daily quiz.
 */
export const gradeDailyQuiz = async (
  questions: QuizQuestion[],
  userAnswers: {[key: string]: string},
  focusTopic: string
): Promise<QuizEvaluation> => {
  
  const perfData = questions.map(q => ({
    question: q.question,
    userAnswer: userAnswers[q.id] || "No answer provided",
    correctAnswer: q.answer
  }));

  const prompt = `
    You are an AI Exam Coach reviewing the student's quiz performance.

    You are given:
    - Focus Topic: ${focusTopic}
    - Questions, User Answers, and Correct Answers:
    ${JSON.stringify(perfData)}

    Analyze and return:

    1. Overall Performance Level:
       - Beginner / Improving / Good / Very Strong

    2. Topic-wise Performance:
       - Topic 1: Strong / Medium / Weak
       - Topic 2: Strong / Medium / Weak

    3. Main Mistake Pattern:
       - Concept gap / Formula misuse / Careless error

    4. One Motivation Message:
       - Short, encouraging, student-friendly

    5. One Clear Instruction for Tomorrow:
       - What exactly the student should revise next

    Return ONLY in this structure:

    # Overall Level:
    # Topic-wise Performance:
    # Main Mistake Pattern:
    # Motivation:
    # Focus for Tomorrow:
  `;

  const result = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "text/plain",
    }
  });

  return {
    formattedEvaluation: result.text || "Failed to generate evaluation."
  };
};