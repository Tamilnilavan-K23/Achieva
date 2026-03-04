import React, { useState, useContext, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import './Auth.css';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Script loading useEffect removed purely in favor of GoogleOAuthProvider wrapper

    // Handle Google Sign-In response
    const handleGoogleResponse = async (response) => {
        try {
            setLoading(true);
            setError('');

            // Send credential to backend
            const res = await API.post('/auth/google-login', {
                credential: response.credential,
                role: role
            });

            login(res.data.user, res.data.token);
            navigate(role === 'student' ? '/student/dashboard' : role === 'proctor' ? '/proctor/dashboard' : '/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Google Sign-In failed. Please try regular login.');
        } finally {
            setLoading(false);
        }
    };

    // Initialize Google button when component mounts
    // Google button initialization useEffect removed

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await API.post(`/auth/${role}/login`, { email, password });
            login(res.data.user, res.data.token);
            navigate(role === 'student' ? '/student/dashboard' : role === 'proctor' ? '/proctor/dashboard' : '/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (resetStep === 1) {
                await API.post('/auth/forgot-password', { email: forgotEmail, role });
                setSuccess('Verification code sent to your email!');
                setResetStep(2);
            } else {
                await API.post('/auth/reset-password', {
                    email: forgotEmail,
                    code: verificationCode,
                    newPassword,
                    role
                });
                setSuccess('Password reset successful! You can now login.');
                setTimeout(() => {
                    setShowForgotPassword(false);
                    setResetStep(1);
                    setForgotEmail('');
                    setVerificationCode('');
                    setNewPassword('');
                    setSuccess('');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <AnimatePresence mode="wait">
                {!showForgotPassword ? (
                    <motion.div
                        key="login"
                        className="auth-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h2>Login</h2>
                        {error && (
                            <motion.div
                                className="error-msg"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)}>
                                    <option value="student">Student</option>
                                    <option value="proctor">Proctor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                            <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#830000',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>

                        {/* Google Sign-In Section */}
                        <div style={{ margin: '20px 0', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                                <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                                <span style={{ padding: '0 10px', fontSize: '0.9rem', color: '#666' }}>OR</span>
                                <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                            </div>

                            {/* Google Sign-In Button (rendered by Google) */}
                            {/* Google Sign-In Button (rendered by specific component) */}
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <GoogleLogin
                                    onSuccess={handleGoogleResponse}
                                    onError={() => {
                                        console.log('Login Failed');
                                        setError('Google Sign-In was unsuccessful. Please try again.');
                                    }}
                                    useOneTap
                                />
                            </div>

                            <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '10px' }}>
                                Note: If Google button doesn't appear, use email/password login above
                            </p>
                        </div>

                        <p className="auth-link">Don't have an account? <a href="/signup">Sign up</a></p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="forgot-password"
                        className="auth-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h2>Reset Password</h2>
                        {error && (
                            <motion.div
                                className="error-msg"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                className="success-msg"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: '#d4edda',
                                    color: '#155724',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    marginBottom: '20px',
                                    border: '1px solid #c3e6cb'
                                }}
                            >
                                {success}
                            </motion.div>
                        )}
                        <form onSubmit={handleForgotPassword}>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)} disabled={resetStep === 2}>
                                    <option value="student">Student</option>
                                    <option value="proctor">Proctor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                    disabled={resetStep === 2}
                                />
                            </div>
                            {resetStep === 2 && (
                                <>
                                    <div className="form-group">
                                        <label>Verification Code</label>
                                        <input
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            required
                                            placeholder="Enter 6-digit code"
                                            maxLength="6"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                minLength="6"
                                                style={{ paddingRight: '40px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
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
                                            >
                                                {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? 'Processing...' : resetStep === 1 ? 'Send Code' : 'Reset Password'}
                            </button>
                        </form>
                        <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetStep(1);
                                    setError('');
                                    setSuccess('');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#830000',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    textDecoration: 'underline'
                                }}
                            >
                                Back to Login
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Login;
