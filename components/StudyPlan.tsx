import React, { useState } from 'react';
import { DiagnosisResult, StudyPlanResult, QuizQuestion, QuizEvaluation } from '../types';
import { generateStudyPlan, generateDailyQuiz, gradeDailyQuiz } from '../services/geminiService';
import { Calendar, Clock, BookOpen, CheckCircle, ChevronDown, ChevronUp, Star, ArrowRight } from 'lucide-react';

interface StudyPlanProps {
  diagnosis: DiagnosisResult;
}

const StudyPlan: React.FC<StudyPlanProps> = ({ diagnosis }) => {
  const [hours, setHours] = useState(2);
  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState<StudyPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: string}>({});
  const [activeQuizQ, setActiveQuizQ] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null);

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const res = await generateStudyPlan(diagnosis.weakTopics, diagnosis.strongTopics, hours, days);
      setPlan(res);
    } catch (e) {
      console.error(e);
      alert('Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  const startDailyQuiz = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      // Pass the weak topics to the quiz generator for adaptive difficulty
      const qs = await generateDailyQuiz(plan.todayFocus, diagnosis.weakTopics);
      setQuizQuestions(qs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const evaluation = await gradeDailyQuiz(quizQuestions, quizAnswers, plan.todayFocus);
      setQuizResult(evaluation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Render markdown for the study plan and evaluation
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (line.startsWith('# ')) {
            return <h3 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 border-b border-indigo-100 pb-2">{line.replace('# ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h4 key={i} className="text-lg font-bold text-indigo-700 mt-4 mb-2">{line.replace('## ', '')}</h4>;
          }
          if (trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
             // Basic bold parser for **text**
             const parts = content.split(/(\*\*.*?\*\*)/g);
             return (
               <div key={i} className="flex items-start ml-2 mb-2">
                 <span className="mr-2 mt-1.5 min-w-[6px] h-[6px] rounded-full bg-indigo-500 block"></span>
                 <span className="text-slate-700 leading-relaxed">
                   {parts.map((part, j) => {
                     if (part.startsWith('**') && part.endsWith('**')) {
                       return <strong key={j} className="text-slate-900 font-semibold">{part.slice(2, -2)}</strong>;
                     }
                     return part;
                   })}
                 </span>
               </div>
             );
          }
          if (!trimmed) {
            return <div key={i} className="h-1" />;
          }
          return <p key={i} className="text-slate-700 mb-1 leading-relaxed">{line}</p>;
        })}
      </div>
    );
  };

  // 1. Input Config Screen
  if (!plan && !loading) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Create Your Study Plan</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hours per day available
            </label>
            <input 
              type="number" 
              min="1" max="12"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="block w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Days until exam
            </label>
            <input 
              type="number" 
              min="1" max="60"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="block w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={handleGeneratePlan}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Generate Study Plan
          </button>
        </div>
      </div>
    );
  }

  // 2. Plan Display View
  if (plan && quizQuestions.length === 0 && !loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Today's Focus Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Today's Focus</h2>
            <p className="text-indigo-100 text-xl mb-6">{plan.todayFocus}</p>
            <button
              onClick={startDailyQuiz}
              className="bg-white text-indigo-700 px-6 py-3 rounded-full font-bold hover:bg-indigo-50 transition-colors shadow-md flex items-center"
            >
              <Star className="w-5 h-5 mr-2" />
              Start Today's Quiz
            </button>
          </div>
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
            <Calendar className="w-64 h-64" />
          </div>
        </div>

        {/* Schedule Display */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="prose prose-indigo max-w-none">
            {plan.formattedPlan ? renderMarkdown(plan.formattedPlan) : (
              <div>
                <h3 className="text-xl font-bold mb-4">Your Schedule</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {plan.schedule.map((dayPlan) => (
                    <div key={dayPlan.day} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-slate-600">Day {dayPlan.day}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{dayPlan.focus}</span>
                      </div>
                      <ul className="space-y-2">
                        {dayPlan.tasks.map((task, i) => (
                          <li key={i} className="flex items-start text-sm text-slate-600">
                            <div className="min-w-[6px] h-[6px] rounded-full bg-slate-400 mt-1.5 mr-2"></div>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Quiz Active View
  if (quizQuestions.length > 0 && !quizResult) {
    const q = quizQuestions[activeQuizQ];
    return (
      <div className="max-w-3xl mx-auto">
         <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Daily Quiz</h2>
            <span className="text-slate-500 font-medium">{activeQuizQ + 1} / {quizQuestions.length}</span>
         </div>
         
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8">
              <p className="text-lg text-slate-900 font-medium mb-6 whitespace-pre-line">{q.question}</p>
              
              <textarea
                value={quizAnswers[q.id] || ''}
                onChange={(e) => setQuizAnswers({...quizAnswers, [q.id]: e.target.value})}
                placeholder="Write your solution..."
                className="w-full h-32 p-4 border border-slate-300 rounded-xl mb-6 focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <div className="flex space-x-4 mb-6">
                <button 
                   onClick={() => setShowSolution(!showSolution)}
                   className="text-indigo-600 text-sm font-semibold hover:underline"
                >
                  {showSolution ? 'Hide Solution' : 'Show Solution'}
                </button>
              </div>

              {showSolution && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-900">
                     <p className="text-sm font-bold uppercase tracking-wide text-indigo-500 mb-1">Correct Answer</p>
                     <p className="font-medium">{q.answer}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-green-800">
                     <p className="text-sm font-bold uppercase tracking-wide text-green-600 mb-1">Step-by-Step Explanation</p>
                     <p className="text-sm whitespace-pre-line leading-relaxed">{q.solution}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between">
               <button
                 disabled={activeQuizQ === 0}
                 onClick={() => { setActiveQuizQ(p => p - 1); setShowSolution(false); }}
                 className="text-slate-600 font-medium disabled:opacity-50 hover:text-indigo-600"
               >
                 Previous
               </button>
               {activeQuizQ < quizQuestions.length - 1 ? (
                 <button
                   onClick={() => { setActiveQuizQ(p => p + 1); setShowSolution(false); }}
                   className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700"
                 >
                   Next Question
                 </button>
               ) : (
                 <button
                   onClick={submitQuiz}
                   className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
                 >
                   Submit & Finish
                 </button>
               )}
            </div>
         </div>
      </div>
    );
  }

  // 4. Quiz Result View
  if (quizResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-indigo-500">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-6 mx-auto w-full">
            <CheckCircle className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Quiz Complete!</h2>
          
          <div className="prose prose-indigo max-w-none text-left">
            {renderMarkdown(quizResult.formattedEvaluation)}
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={() => {
               // Reset to plan view (keep plan, reset quiz)
               setQuizQuestions([]);
               setQuizResult(null);
            }}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Back to Study Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
      <p className="text-slate-600 font-medium">Loading...</p>
    </div>
  );
};

export default StudyPlan;