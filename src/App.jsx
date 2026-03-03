import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyTasks from './pages/DailyTasks';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Research from './pages/Research';
import ResearchDetail from './pages/ResearchDetail';
import Trending from './pages/Trending';
import Profile from './pages/Profile';
import './App.css';

/* ─── Global Effects Hook ─── */
function useGlobalEffects() {
  useEffect(() => {
    // Card mouse-tracking glow + spotlight
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      // Spotlight card effect
      const spotlightCards = document.querySelectorAll('.card-spotlight');
      spotlightCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        card.style.setProperty('--spotlight-x', `${x}%`);
        card.style.setProperty('--spotlight-y', `${y}%`);
      });
    };
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Enhanced scroll-reveal observer (supports multiple directions)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    const revealSelectors = '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale';
    document.querySelectorAll(revealSelectors).forEach(el => revealObserver.observe(el));

    // Lazy image loaded handler
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.complete) img.classList.add('loaded');
      else img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      revealObserver.disconnect();
    };
  }, []);
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  useGlobalEffects();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <DataProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/daily-tasks" element={<DailyTasks />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/research" element={<Research />} />
            <Route path="/research/:id" element={<ResearchDetail />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </DataProvider>
  );
}

function AuthRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function LandingRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
