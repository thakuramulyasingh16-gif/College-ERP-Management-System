import React, { useState, useEffect } from 'react';

const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, ' ');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="fixed bottom-6 right-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl text-white z-50 transition-all hover:scale-105 group">
      <div className="flex flex-col items-end">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
          Live System Time
        </div>
        <div className="font-mono text-2xl font-black tracking-tighter">
          {formatTime(date)}
        </div>
        <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
          {formatDate(date)}
        </div>
      </div>
    </div>
  );
};

export default Clock;
