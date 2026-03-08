import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddContact from './pages/AddContact';
import ContactProfile from './pages/ContactProfile';
import Events from './pages/Events';
import Scanner from './pages/Scanner';
import NetworkGraph from './pages/NetworkGraph';
import QRPage from './pages/QRPage';
import PublicConnect from './pages/PublicConnect';
import GoogleContacts from './pages/GoogleContacts';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public form — no layout chrome */}
        <Route path="/connect" element={<PublicConnect />} />

        {/* Main app with nav */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddContact />} />
          <Route path="/contacts/:id" element={<ContactProfile />} />
          <Route path="/events" element={<Events />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/graph" element={<NetworkGraph />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/google" element={<GoogleContacts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
