
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Configurar classe inicial no HTML para evitar flash
const html = document.documentElement;
const savedTheme = localStorage.getItem('novus-erp-theme') || 'light';
html.classList.add(savedTheme);

console.log('[Theme] Tema inicial carregado:', savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
