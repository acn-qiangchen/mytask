import { HashRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './aws-config';
import { AppProvider } from './context/AppContext';
import { LangProvider } from './context/LangContext';
import { TimerProvider } from './context/TimerContext';
import { TopBar } from './components/layout/TopBar';
import { TimerPage } from './pages/TimerPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DebugPage } from './pages/DebugPage';
import { TicketsPage } from './pages/TicketsPage';

export default function App() {
  return (
    <LangProvider>
      <Authenticator>
        {() => (
          <AppProvider>
            <TimerProvider>
            <HashRouter>
              <div className="flex flex-col min-h-screen">
                <TopBar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<TimerPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/tickets" element={<TicketsPage />} />
                    <Route path="/debug" element={<DebugPage />} />
                  </Routes>
                </main>
              </div>
            </HashRouter>
            </TimerProvider>
          </AppProvider>
        )}
      </Authenticator>
    </LangProvider>
  );
}
