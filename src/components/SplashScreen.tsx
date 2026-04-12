import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface SplashScreenProps {
  settings: AppSettings;
  error: string | null;
  loadTimeout: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ settings, error, loadTimeout }) => {
  const displayLogo = settings.appLogo;
  const displayName = settings.appName;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="space-y-8 w-full max-w-xs">
        <div className="space-y-8">
          {displayLogo ? (
            <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl mx-auto bg-slate-900 flex items-center justify-center">
              <img src={displayLogo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          )}
          
          {error || loadTimeout ? (
            <div className="space-y-6">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-white font-bold mb-2">Connection Issue</h2>
                <p className="text-red-400 text-xs font-medium leading-relaxed">
                  {error || "The app is taking longer than usual to load. Please check your internet or try again."}
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-blue-600 rounded-2xl font-bold text-white shadow-xl shadow-blue-600/20"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayName ? (
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {displayName}
                </h1>
              ) : (
                <div className="h-8 w-32 bg-slate-900/50 rounded-lg mx-auto animate-pulse" />
              )}
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div className="w-1/2 h-full bg-blue-500 animate-pulse" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                  Initializing Session...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
