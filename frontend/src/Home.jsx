import React from 'react';
import { useNavigate } from 'react-router-dom'; 
import './Home.css';
import logoApp from './imgs/logoInicial.png'; // Asegúrate de tener el logo en esta ruta

function Home({ onEnterApp }) {
  const navigate = useNavigate();
  // La ruta principal después de la bienvenida
  const MAIN_APP_ROUTE = '/pacientes'; 

  const handleClick = () => {
    // 1. Marcar la app como visitada (persistencia en localStorage)
    onEnterApp(); 
    
    // 2. Redirigir a la vista de Pacientes/Navegador
    navigate(MAIN_APP_ROUTE, { replace: true });
  };

  return (
    <div className="home-screen-container container"> 
      
      <img 
        src={logoApp} 
        alt="Logo del Sistema de Gestión de Subsidios" 
        className="home-logo" // Clase CSS para estilizar la imagen
      />
      
      <button 
        onClick={handleClick}
        className="btn btn-primary m-top-40" 
      >
        Ingresar
      </button>
    </div>
  );
}

export default Home;