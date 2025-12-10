import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, ArrowRight } from 'lucide-react';
import { analyzeNotes } from '../services/geminiService';
import { AnalysisResult } from '../types';

interface UploadNotesProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const UploadNotes: React.FC<UploadNotesProps> = ({ onAnalysisComplete }) => {
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data url prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() && !file) {
      setError('Please enter text or upload a file.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      let fileData = null;
      if (file) {
        const base64 = await convertFileToBase64(file);
        fileData = {
          data: base64,
          mimeType: file.type
        };
      }

      const data = await analyzeNotes(textInput, fileData);
      setResult(data);
    } catch (err: any) {
      setError('Failed to analyze notes. Please try again. ' + (err.message || ''));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simple renderer for the requested markdown format
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (line.startsWith('# ')) {
            return <h3 key={i} className="text-xl font-bold text-indigo-900 mt-6 mb-3 border-b border-indigo-100 pb-2">{line.replace('# ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h4 key={i} className="text-lg font-bold text-indigo-800 mt-4 mb-2">{line.replace('## ', '')}</h4>;
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
            return <div key={i} className="h-2" />;
          }
          return <p key={i} className="text-slate-700 mb-1 leading-relaxed">{line}</p>;
        })}
      </div>
    );
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Analysis Complete!</h2>
              <p className="text-slate-500 text-sm">Here is your structured study summary</p>
            </div>
          </div>
          
          <div className="prose prose-indigo max-w-none">
            {renderMarkdown(result.formattedAnalysis)}
          </div>
        </div>

        <button
          onClick={() => onAnalysisComplete(result)}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex justify-center items-center"
        >
          Continue to Diagnosis
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Study Material</h2>
        <p className="text-slate-500 mb-6">We'll identify key topics, formulas, and focus areas for you.</p>
        
        {/* File Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6 ${
            file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,image/*"
          />
          {file ? (
            <div className="flex flex-col items-center text-indigo-700">
              <FileText className="w-12 h-12 mb-2" />
              <span className="font-medium">{file.name}</span>
              <span className="text-sm opacity-75">Click to change</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <Upload className="w-12 h-12 mb-2" />
              <span className="font-medium">Click to upload PDF or Image</span>
              <span className="text-sm opacity-75">Supported: PDF, JPG, PNG</span>
            </div>
          )}
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Or paste raw notes</span>
          </div>
        </div>

        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste your notes, summaries, or key formulas here..."
          className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-6"
        />

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`w-full py-3 rounded-xl font-semibold text-white shadow-md transition-all flex justify-center items-center ${
            isAnalyzing ? 'bg-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing via Gemini 3 Pro...
            </>
          ) : (
            'Analyze My Notes'
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadNotes;