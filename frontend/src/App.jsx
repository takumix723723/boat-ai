import { Routes, Route } from 'react-router-dom';
import RaceListPage from './pages/RaceListPage';
import RaceDetailPage from './pages/RaceDetailPage';
import AiRankingPage from './pages/AiRankingPage';
import AnalyticsAccuracyPage from './pages/AnalyticsAccuracyPage';
import WatchPage from './pages/WatchPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RaceListPage />} />
        <Route path="/ranking" element={<AiRankingPage />} />
        <Route path="/analytics" element={<AnalyticsAccuracyPage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/race/:id" element={<RaceDetailPage />} />
      </Routes>
    </Layout>
  );
}
