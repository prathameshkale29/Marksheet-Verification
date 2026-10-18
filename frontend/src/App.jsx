import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import VerifiedDocuments from './pages/VerifiedDocuments';
import VerificationHistory from './pages/VerificationHistory';
import AdminDashboard from './pages/AdminDashboard';
import SettingsPage from './pages/SettingsPage';
import EncoderDecoderPage from './pages/EncoderDecoderPage';
import MarksheetReviewPage from './pages/MarksheetReviewPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/documents" element={<VerifiedDocuments />} />
            <Route path="/history" element={<VerificationHistory />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/encode" element={<EncoderDecoderPage />} />
            <Route path="/review/:verificationId" element={<MarksheetReviewPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
