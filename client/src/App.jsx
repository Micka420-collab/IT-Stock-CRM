import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Phones from './pages/Phones';
import History from './pages/History';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import LoanPCs from './pages/LoanPCs';
import PrtHistory from './pages/PrtHistory';
import Layout from './components/Layout';

import { TutorialProvider } from './context/TutorialContext';
import { GamificationProvider } from './context/GamificationContext';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <AuthProvider>
                    <TutorialProvider>
                        <GamificationProvider>
                            <BrowserRouter>
                                <Routes>
                                    <Route path="/login" element={<Login />} />

                                    <Route path="/" element={
                                        <ProtectedRoute>
                                            <Layout />
                                        </ProtectedRoute>
                                    }>
                                        <Route index element={<Navigate to="/dashboard" replace />} />
                                        <Route path="dashboard" element={<Dashboard />} />
                                        <Route path="inventory" element={<Inventory />} />
                                        <Route path="phones" element={<Phones />} />
                                        <Route path="history" element={<History />} />
                                        <Route path="reports" element={<Reports />} />
                                        <Route path="loan-pcs" element={<LoanPCs />} />
                                        <Route path="prt-history/:prt?" element={<PrtHistory />} />
                                        <Route path="settings" element={<Settings />} />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </GamificationProvider>
                    </TutorialProvider>
                </AuthProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}

export default App;
