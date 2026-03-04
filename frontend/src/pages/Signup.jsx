import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './Auth.css';

import { motion } from 'framer-motion';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        registerNo: '',
        department: '',
        year: '1st'
    });
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/auth/student/register', formData);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please check your details.');
        }
    };

    return (
        <div className="auth-container">
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2>Student Signup</h2>
                {error && (
                    <motion.div
                        className="error-msg"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {error}
                    </motion.div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Name</label>
                        <input type="text" name="name" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                onChange={handleChange}
                                required
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '0',
                                    color: '#666'
                                }}
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Register Number</label>
                        <input type="text" name="registerNo" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Department</label>
                        <input type="text" name="department" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Year</label>
                        <select name="year" onChange={handleChange}>
                            <option value="1st">1st Year</option>
                            <option value="2nd">2nd Year</option>
                            <option value="3rd">3rd Year</option>
                            <option value="4th">4th Year</option>
                        </select>
                    </div>
                    <button type="submit" className="auth-btn">Sign Up</button>
                </form>
                <p className="auth-link">Already have an account? <a href="/login">Login</a></p>
            </motion.div>
        </div>
    );
};

export default Signup;
