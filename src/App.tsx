import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth from '@/pages/Auth';
import { UserProfile } from '@/components/UserProfile';
import { AuthProvider } from '@/hooks/useAuth';
import { SecurityProvider } from '@/components/SecurityProvider';
import { AuthGuard } from '@/components/AuthGuard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <AuthGuard>
                <Routes>
                  <Route path="/" element={<UserProfile />} />
                </Routes>
              </AuthGuard>
            } />
          </Routes>
        </SecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
