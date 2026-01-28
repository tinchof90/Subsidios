import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa el cliente de ReactDOM
import App from './App.jsx'; // Importa tu componente principal App
import '@fortawesome/fontawesome-svg-core/styles.css'
import './App.css';
import "./components/modal/Modal.css";

// Busca el elemento con el ID 'root' en tu archivo index.html
// y renderiza tu componente App dentro de él.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
