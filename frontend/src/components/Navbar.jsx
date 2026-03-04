import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';
import tceLogo from '../assets/tce_logo_contact.png';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        logout();
        closeMenu();
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo" onClick={closeMenu}>
                    <img src={tceLogo} alt="TCE Logo" className="logo-banner" />
                </Link>

                <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
                    <span className={isMenuOpen ? 'active' : ''}></span>
                    <span className={isMenuOpen ? 'active' : ''}></span>
                    <span className={isMenuOpen ? 'active' : ''}></span>
                </button>

                <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/" className="nav-link" onClick={closeMenu}>Home</Link>
                    {user ? (
                        <>
                            <span className="user-greeting">Hi, {user.role === 'proctor' ? 'Proctor' : user.name || user.email?.split('@')[0]}</span>
                            {user.role === 'student' && <Link to="/student/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>}
                            {user.role === 'proctor' && <Link to="/proctor/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>}
                            {user.role === 'admin' && <Link to="/admin/dashboard" className="nav-link" onClick={closeMenu}>Dashboard</Link>}
                            <button onClick={handleLogout} className="nav-btn logout-btn">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
                            <Link to="/signup" className="nav-link" onClick={closeMenu}>Signup</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
