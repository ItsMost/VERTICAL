import { DataProvider, useData } from './context/DataContext';
import AppShell from './AppShell';
import AuthGate from './AuthGate';
import { Toaster } from './components/Toast';

export default function App() {
  return (
    <AuthGate>
    <DataProvider>
      <div className="relative min-h-svh bg-bg text-text">
        <AppShell />
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
