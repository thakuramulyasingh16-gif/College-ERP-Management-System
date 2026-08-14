import React from 'react';

export const Loader = () => (
  <div className="flex flex-col items-center justify-center p-12 space-y-4">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading data...</p>
  </div>
);

export const ErrorMessage = ({ message, retry }) => (
  <div className="p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
    </div>
    <h3 className="text-red-900 font-black text-lg mb-2">Error Loading Data</h3>
    <p className="text-red-600 font-medium mb-6">{message || "Something went wrong while fetching the data."}</p>
    {retry && (
      <button 
        onClick={retry}
        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
      >
        Try Again
      </button>
    )}
  </div>
);
