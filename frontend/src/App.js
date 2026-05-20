import { Routes, Route } from 'react-router-dom';
import Navbar    from './components/Navbar';
import HomePage  from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import JobDetailPage from './pages/JobDetailPage';
import PostJobPage from './pages/PostJobPage';
import AIAgentPage from './pages/AIAgentPage';
import LoginPage  from './pages/LoginPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import AIFloatingWidget from './components/AIFloatingWidget';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/search"    element={<SearchPage />} />
        <Route path="/jobs/:id"  element={<JobDetailPage />} />
        <Route path="/post-job"  element={<PostJobPage />} />
        <Route path="/ai"        element={<AIAgentPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/alerts"    element={<AlertsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Routes>
      <AIFloatingWidget />
    </>
  );
}
