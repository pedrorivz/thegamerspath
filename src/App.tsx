import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navigation } from './components/Navigation';
import { PrivateRoute } from './components/PrivateRoute';
import { ToastProvider } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useLibrary } from './store/library';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const GameDetail = lazy(() => import('./pages/GameDetail').then(m => ({ default: m.GameDetail })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const PageFallback = () => (
  <div className="min-h-dvh flex items-center justify-center">
    <div className="w-7 h-7 border-2 border-violet-700 border-t-violet-400 rounded-full animate-spin" />
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageFallback />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
          <Route path="/game/:id" element={<PrivateRoute><GameDetail /></PrivateRoute>} />
          <Route path="/library" element={<PrivateRoute><Library /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function AppContent() {
  const { init, token } = useAuth();
  const sync = useLibrary(s => s.sync);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (token) sync(); }, [token, sync]);

  return (
    <div className="max-w-lg mx-auto relative">
      <AnimatedRoutes />
      <Navigation />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ToastProvider />
    </BrowserRouter>
  );
}
