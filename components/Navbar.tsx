import React from 'react';
import { ViewState } from '../types';
import { BookOpen, Brain, Activity, Calendar } from 'lucide-react';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  canNavigate: (view: ViewState) => boolean;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, canNavigate }) => {
  const navItems = [
    { id: ViewState.HOME, label: 'Home', icon: BookOpen },
    { id: ViewState.UPLOAD, label: 'Notes', icon: Brain },
    { id: ViewState.DIAGNOSE, label: 'Diagnose', icon: Activity },
    { id: ViewState.PLAN, label: 'Study Plan', icon: Calendar },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-indigo-600 flex items-center gap-2">
              <Brain className="w-6 h-6" />
              AI Exam Coach
            </span>
          </div>
          <div className="flex space-x-4 items-center overflow-x-auto">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isEnabled = canNavigate(item.id);
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => isEnabled && onNavigate(item.id)}
                  disabled={!isEnabled}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : isEnabled
                      ? 'text-slate-600 hover:bg-slate-50'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
