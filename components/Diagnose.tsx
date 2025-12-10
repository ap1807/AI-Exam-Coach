import React, { useState } from 'react';
import { AnalysisResult, Question, DiagnosisResult } from '../types';
import { generateDiagnosticTest, evaluateDiagnostic } from '../services/geminiService';
import { Play, HelpCircle, ChevronRight, BarChart } from 'lucide-react';

interface DiagnoseProps {
  analysisData: AnalysisResult;
  onDiagnosisComplete: (result: DiagnosisResult) => void;
}

const Diagnose: React.FC<DiagnoseProps> = ({ analysisData, onDiagnosisComplete }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(analysisData.subjects[0] || 'General');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [showHint, setShowHint] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handleStartTest = async () => {
    setIsGenerating(true);
    try {
      // Filter topics belonging to subject if structure allows, else use all topics
      // For simplicity, we pass all detected topic names
      const topicNames = analysisData.topics.map(t => t.name);
      const qs = await generateDiagnosticTest(selectedSubject, topicNames);
      setQuestions(qs);
    } catch (e) {
      console.error(e);
      alert('Failed to generate test. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSubmit = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setShowHint(false);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    setIsEvaluating(true);
    try {
      const qaPairs = questions.map(q => ({
        question: q.text,
        answer: answers[q.id] || "No answer provided"
      }));
      const topicNames = analysisData.topics.map(t => t.name);
      const diagResult = await evaluateDiagnostic(selectedSubject, qaPairs, topicNames);
      setResult(diagResult);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Render markdown for diagnosis
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (line.startsWith('# ')) {
            return <h3 key={i} className="text-xl font-bold text-indigo-900 mt-6 mb-3 border-b border-indigo-100 pb-2">{line.replace('# ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h4 key={i} className="text-lg font-bold text-indigo-800 mt-4 mb-2">{line.replace('## ', '')}</h4>;
          }
          // Bullet points
          if (trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
            return (
              <div key={i} className="flex items-start ml-2 mb-2">
                <span className="mr-2 mt-1.5 min-w-[6px] h-[6px] rounded-full bg-indigo-500 block"></span>
                <span className="text-slate-700 leading-relaxed">{content}</span>
              </div>
            );
          }
          // Numbered lists (1. Action)
          if (/^\d+\./.test(trimmed)) {
            const content = trimmed.replace(/^\d+\.\s*/, '');
            const number = trimmed.match(/^\d+/)?.[0];
            return (
              <div key={i} className="flex items-start ml-2 mb-2">
                <span className="mr-2 font-bold text-indigo-600">{number}.</span>
                <span className="text-slate-700 leading-relaxed">{content}</span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={i} className="h-2" />;
          }
          return <p key={i} className="text-slate-700 mb-1 leading-relaxed">{line}</p>;
        })}
      </div>
    );
  };

  // 1. Initial Selection State
  if (questions.length === 0 && !isGenerating) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Diagnostic Test Setup</h2>
        <p className="text-slate-600 mb-6">Select a subject from your notes to generate a quick diagnostic test.</p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {analysisData.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="General">General Review</option>
          </select>
        </div>

        <button 
          onClick={handleStartTest}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
        >
          <Play className="w-5 h-5 mr-2" />
          Generate Quick Test
        </button>
      </div>
    );
  }

  // 2. Loading State
  if (isGenerating || isEvaluating) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-600 font-medium">
          {isGenerating ? "Gemini is crafting your questions..." : "Gemini is analyzing your performance..."}
        </p>
      </div>
    );
  }

  // 3. Results State
  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100">
          <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
            <BarChart className="w-8 h-8 text-indigo-600 mr-3" />
            <h2 className="text-2xl font-bold text-slate-900">Diagnosis Results</h2>
          </div>

          <div className="prose prose-indigo max-w-none mb-8">
             {result.formattedDiagnosis ? renderMarkdown(result.formattedDiagnosis) : <p>{result.feedback}</p>}
          </div>

          <button
            onClick={() => onDiagnosisComplete(result)}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-md transition-transform transform hover:-translate-y-0.5"
          >
            Create My Study Plan
          </button>
        </div>
      </div>
    );
  }

  // 4. Quiz Taking State
  const currentQ = questions[currentQuestionIdx];
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between items-center text-sm font-medium text-slate-500">
        <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
        <span>Subject: {selectedSubject}</span>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">{currentQ.text}</h3>

        <div className="mb-6">
          <textarea
            value={answers[currentQ.id] || ''}
            onChange={(e) => setAnswers({...answers, [currentQ.id]: e.target.value})}
            placeholder="Type your answer here..."
            className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {showHint && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200 animate-fade-in">
            <strong>Hint:</strong> {currentQ.hint}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>

          <button
            onClick={handleAnswerSubmit}
            disabled={!answers[currentQ.id]?.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center"
          >
            {currentQuestionIdx === questions.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Diagnose;