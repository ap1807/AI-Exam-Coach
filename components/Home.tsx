import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface HomeProps {
  onStart: () => void;
}

const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="bg-indigo-50 p-4 rounded-full mb-6">
        <span className="text-3xl">🎓</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
        Your personal AI mentor for <br/>
        <span className="text-indigo-600">smarter exam preparation</span>
      </h1>
      <p className="max-w-2xl text-lg text-slate-600 mb-8">
        Upload your notes, let AI find your weak areas, and get a daily personalized study plan with practice questions. Stop guessing what to study.
      </p>
      
      <button
        onClick={onStart}
        className="group inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-full shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
      >
        Start Now
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {[
          { title: 'Upload Notes', desc: 'PDF, Images, or Text', icon: '📄' },
          { title: 'Diagnose Weakness', desc: 'AI-generated test', icon: '🔍' },
          { title: 'Get a Plan', desc: 'Daily schedule & Quizzes', icon: '📅' },
        ].map((feature, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl mb-2">{feature.icon}</div>
            <h3 className="font-semibold text-slate-900">{feature.title}</h3>
            <p className="text-sm text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
