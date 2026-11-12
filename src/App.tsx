import React from 'react';
import { DataProvider } from './context/DataContext';
import JumpCalculator from './JumpCalculator';
import AuthGate from './AuthGate';
import { Toaster } from './components/Toast';

export default function App() {
  return (
    <AuthGate>
    <DataProvider>
      <div className="relative min-h-screen bg-[#09090B] text-[#F4F4F5] selection:bg-[#D4FF00] selection:text-[#09090B]">
        <JumpCalculator />
        <Toaster />
      </div>
    </DataProvider>
    </AuthGate>
  );
}
