import React from 'react';
import { DataProvider } from './context/DataContext';
import JumpCalculator from './JumpCalculator';

export default function App() {
  return (
    <DataProvider>
      <div className="relative min-h-screen bg-[#09090B] text-[#F4F4F5] selection:bg-[#D4FF00] selection:text-[#09090B]">
        <JumpCalculator />
      </div>
    </DataProvider>
  );
}
