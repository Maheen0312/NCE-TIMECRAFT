import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
        !isOnline
          ? 'bg-red-600 text-white'
          : 'bg-emerald-600 text-white'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>You are currently offline. Changes will be synchronized when connection is restored.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Internet connection restored. Live database synchronization active.</span>
        </>
      )}
    </div>
  );
};
