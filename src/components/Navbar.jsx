import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/App.css';

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const handleLogout = () => {
    localStorage.removeItem('employeeToken');
    setIsAuthenticated(false);
  };

  return (
    <nav className="navbar">
      <h1>Employee Attendance</h1>
      <div className="nav-links">
        {!isAuthenticated ? (
          <>
            <Link to="/register">Register</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            <Link to="/attendance">Attendance</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;