import { DataProvider, useData } from './context/DataContext';
import JumpCalculator from './JumpCalculator';
import AuthGate from './AuthGate';
import { Toaster } from './components/Toast';

export default function App() {
  return (
    <AuthGate>
    <DataProvider>
      <div className="relative min-h-screen bg-bg text-text selection:bg-accent selection:text-accent-ink">
        <JumpCalculator />
        <LocalizedToaster />
      </div>
    </DataProvider>
    </AuthGate>
  );
}

function LocalizedToaster() {
  const { t } = useData();
  return <Toaster closeLabel={t.media.close} />;
}
