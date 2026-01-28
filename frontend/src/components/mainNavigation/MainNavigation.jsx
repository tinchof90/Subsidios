import React from 'react';
import { NavLink } from 'react-router-dom';
import './MainNavigation.css';

/**
 * Subsidior: MainNavigation
 * Componente de navegación optimizado con detección de ruta activa.
 */
const MainNavigation = () => {
  // Esta función asigna 'nav-link active' si la ruta coincide, de lo contrario solo 'nav-link'
  const setActiveClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <nav className="main-nav">
      <ul className="nav-list">
        <li>
          <NavLink to="/pacientes" className={setActiveClass}>
            Pacientes
          </NavLink>
        </li>
        <li>
          <NavLink to="/centros" className={setActiveClass}>
            Centros
          </NavLink>
        </li>
        <li>
          <NavLink to="/expedientes" className={setActiveClass}>
            Expedientes
          </NavLink>
        </li>
        <li>
          <NavLink to="/valorCuotas" className={setActiveClass}>
            Cuotas
          </NavLink>
        </li>
        <li>
          <NavLink to="/reportes" className={setActiveClass}>
            Reportes
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default MainNavigation;