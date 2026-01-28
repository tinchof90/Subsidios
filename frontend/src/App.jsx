import React, { useState } from 'react';
import { 
    BrowserRouter as Router, 
    Routes, 
    Route,
    Navigate // Necesario para redireccionar
} from 'react-router-dom';
import './App.css'; 
import MainNavigation from './components/mainNavigation/MainNavigation';
import Home from './Home.jsx'; // Tu componente Home

// Contenedores de Vistas
import CentrosContainer from './components/centros/CentrosContainer';
import CuotasContainer from './components/cuotas/CuotasContainer';
import ExpedientesContainer from './components/expedientes/ExpedientesContainer';
import PacientesContainer from './components/pacientes/PacientesContainer';
import ReportesContainer from './components/reportes/ReportesContainer';

function App() {
    // ESTADO: Siempre comienza en false en cada recarga
    const [hasEnteredApp, setHasEnteredApp] = useState(false);

    // Función para cambiar el estado y habilitar el sistema
    const handleEnterApp = () => {
        setHasEnteredApp(true);
    };

    // La ruta principal donde queremos aterrizar tras el clic
    const MAIN_APP_ROUTE = "/pacientes";

    // Si el usuario AÚN NO ha ingresado, solo mostramos el Home.
    if (!hasEnteredApp) {
        return (
            // NOTA: No necesitamos el <Router> aquí si usamos Routes/Route. 
            // Pero si envuelves todo en el <Router> en main.jsx, esto se simplifica:
            <Router>
                {/* Aquí, forzamos la ruta HOME en la raíz, sin importar la URL actual.
                  El componente Home es el que habilita el resto de la App.
                */}
                <div className="home-only-layout">
                    <Home onEnterApp={handleEnterApp} />
                </div>
            </Router>
        );
    }

    // Si el usuario YA INGRESÓ (hasEnteredApp es true), mostramos el sistema completo.
    return (
        <Router>
            <div className="app-layout">
                
                {/* 1. La barra de navegación se renderiza solo después de ingresar */}
                <header className="app-header">
                    <MainNavigation />
                </header>

                <main className="app-main-content">
                    <Routes>
                        {/* 2. La ruta raíz (/) siempre redirige a la vista principal (navegador) */}
                        <Route path="/" element={<Navigate to={MAIN_APP_ROUTE} replace />} />

                        {/* 3. Rutas normales de la aplicación */}
                        <Route path={MAIN_APP_ROUTE} element={<PacientesContainer />} />
                        <Route path="/expedientes" element={<ExpedientesContainer />} />
                        <Route path="/centros" element={<CentrosContainer />} />
                        <Route path="/valorCuotas" element={<CuotasContainer />} />
                        <Route path="/reportes" element={<ReportesContainer />} />
                        
                        {/* 4. Cualquier ruta desconocida dentro del sistema va a la vista principal */}
                        <Route path="*" element={<Navigate to={MAIN_APP_ROUTE} replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;