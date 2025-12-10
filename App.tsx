import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './components/Home';
import UploadNotes from './components/UploadNotes';
import Diagnose from './components/Diagnose';
import StudyPlan from './components/StudyPlan';
import { ViewState, AnalysisResult, DiagnosisResult } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  
  // Application State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // Navigation Guard Logic
  const canNavigate = (view: ViewState): boolean => {
    if (view === ViewState.HOME) return true;
    if (view === ViewState.UPLOAD) return true;
    if (view === ViewState.DIAGNOSE) return !!analysisResult;
    if (view === ViewState.PLAN) return !!diagnosisResult;
    return false;
  };

  const handleNavigate = (view: ViewState) => {
    if (canNavigate(view)) {
      setCurrentView(view);
    }
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setCurrentView(ViewState.DIAGNOSE);
  };

  const handleDiagnosisComplete = (result: DiagnosisResult) => {
    setDiagnosisResult(result);
    setCurrentView(ViewState.PLAN);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Navbar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        canNavigate={canNavigate}
      />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === ViewState.HOME && (
          <Home onStart={() => setCurrentView(ViewState.UPLOAD)} />
        )}
        
        {currentView === ViewState.UPLOAD && (
          <UploadNotes onAnalysisComplete={handleAnalysisComplete} />
        )}
        
        {currentView === ViewState.DIAGNOSE && analysisResult && (
          <Diagnose 
            analysisData={analysisResult} 
            onDiagnosisComplete={handleDiagnosisComplete} 
          />
        )}
        
        {currentView === ViewState.PLAN && diagnosisResult && (
          <StudyPlan diagnosis={diagnosisResult} />
        )}
      </main>
    </div>
  );
}

export default App;
