import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './Home.css';
import tceLogo from '../assets/tce_logo_contact.png';

import { motion } from 'framer-motion';

const Home = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [hackathons, setHackathons] = useState([]);
    const [upcomingHackathons, setUpcomingHackathons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [upcomingLoading, setUpcomingLoading] = useState(true);
    const [selectedPoster, setSelectedPoster] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [hackathonsRes, upcomingRes] = await Promise.all([
                    API.get('/hackathons/accepted'),
                    API.get('/upcoming-hackathons')
                ]);
                setHackathons(hackathonsRes.data);
                setUpcomingHackathons(upcomingRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
                setUpcomingLoading(false);
            }
        };
        fetchData();
    }, []);

    const dummyCompletedHackathons = [
        {
            _id: 'comp1',
            studentId: { _id: 'dummy_s1', name: 'John Doe', registerNo: '21CS001', department: 'CSBS', year: '3rd' },
            hackathonTitle: 'Hacktoberfest 2025',
            organization: 'DigitalOcean',
            mode: 'Online',
            date: '2025-10-15T00:00:00.000Z',
            description: 'Contributed to 4 open source projects across various tech stacks in this month-long celebration of open source software.',
            status: 'Accepted'
        },
        {
            _id: 'comp2',
            studentId: { _id: 'dummy_s2', name: 'Jane Smith', registerNo: '22CS045', department: 'CSBS', year: '2nd' },
            hackathonTitle: 'MIT Reality Hack',
            organization: 'MIT',
            mode: 'Offline',
            date: '2026-01-20T00:00:00.000Z',
            description: 'Built an AR/VR application for educational visualization.',
            status: 'Accepted'
        },
        {
            _id: 'comp3',
            studentId: { _id: 'dummy_s1', name: 'John Doe', registerNo: '21CS001', department: 'CSBS', year: '3rd' },
            hackathonTitle: 'Global AI Hackathon',
            organization: 'Microsoft',
            mode: 'Online',
            date: '2025-11-05T00:00:00.000Z',
            description: 'Developed an AI-powered accessibility tool for visually impaired users using Azure Cognitive Services.',
            status: 'Accepted'
        },
        {
            _id: 'comp4',
            studentId: { _id: 'dummy_s3', name: 'Alice Johnson', registerNo: '20CS101', department: 'CSBS', year: '4th' },
            hackathonTitle: 'ETHGlobal Waterloo',
            organization: 'ETHGlobal',
            mode: 'Offline',
            date: '2025-06-25T00:00:00.000Z',
            description: 'Built a decentralized application (dApp) for supply chain transparency using smart contracts.',
            status: 'Accepted'
        }
    ];

    const displayCompletedHackathons = [...hackathons, ...dummyCompletedHackathons];

    // Group hackathons by student
    const groupedByStudent = displayCompletedHackathons.reduce((acc, hackathon) => {
        const studentId = hackathon.studentId?._id;
        if (!studentId) return acc;
        if (!acc[studentId]) {
            acc[studentId] = {
                student: hackathon.studentId,
                hackathons: []
            };
        }
        acc[studentId].hackathons.push(hackathon);
        return acc;
    }, {});

    const dummyUpcomingHackathons = [
        {
            _id: 'd1',
            title: 'Smart India Hackathon 2026',
            organization: 'Ministry of Education, Govt. of India',
            mode: 'Offline',
            hackathonDate: '2026-08-15T00:00:00.000Z',
            registrationDeadline: '2026-07-10T00:00:00.000Z',
            description: 'A nationwide initiative to provide students a platform to solve pressing problems in our daily lives.',
            posterPath: '/sih_poster.png'
        },
        {
            _id: 'd2',
            title: 'TCE Innovate 360',
            organization: 'Thiagarajar College of Engineering',
            mode: 'Hybrid',
            hackathonDate: '2026-05-20T00:00:00.000Z',
            registrationDeadline: '2026-05-10T00:00:00.000Z',
            description: 'Annual college-level hackathon focusing on sustainable solutions, AI, and IoT for a smarter campus.',
            posterPath: '/tce_innovate_poster.png'
        },
        {
            _id: 'd3',
            title: 'Google Solution Challenge',
            organization: 'Google Developer Student Clubs',
            mode: 'Online',
            hackathonDate: '2026-06-10T00:00:00.000Z',
            registrationDeadline: '2026-05-30T00:00:00.000Z',
            description: 'Build a solution to a local problem using Google technologies, aligned with the UN 17 SDGs.',
            posterPath: '/google_solution_poster.png'
        },
        {
            _id: 'd4',
            title: 'Hack To Future',
            organization: 'Tech Mahindra',
            mode: 'Online',
            hackathonDate: '2026-07-22T00:00:00.000Z',
            registrationDeadline: '2026-07-05T00:00:00.000Z',
            description: 'Create innovative software projects that shape the future of tech. Cash prizes and internship opportunities.',
            posterPath: '/hack_to_future_poster.png'
        }
    ];

    const displayHackathons = [...upcomingHackathons, ...dummyUpcomingHackathons];

    const [expandedStudentId, setExpandedStudentId] = useState(null);

    const toggleExpand = (studentId) => {
        setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
    };

    return (
        <div className="home-container">
            <motion.header
                className="hero-section"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '800' }}>Department of Computer Science and Business Systems</h1>
                <p style={{ fontSize: '1.4rem', fontWeight: '500', opacity: '0.95' }}>Thiagarajar College of Engineering</p>
                <div style={{ width: '60px', height: '4px', background: '#fff', margin: '20px auto', borderRadius: '2px' }}></div>
                <p style={{ marginTop: '20px', fontSize: '1.1rem', maxWidth: '800px', margin: '20px auto', lineHeight: '1.6' }}>
                    Welcome to the Hackathon Management Portal. This platform facilitates the seamless submission, verification, and approval of student hackathon participations.
                    Track your progress and view approved hackathons from your peers.
                </p>
            </motion.header>

            {/* Upcoming Hackathons Section */}
            <motion.section
                className="upcoming-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                style={{
                    background: 'white',
                    padding: '40px 20px',
                    borderRadius: '12px',
                    margin: '40px 0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
            >
                <h2 style={{ color: '#830000', marginBottom: '30px', textAlign: 'center' }}>Upcoming Hackathons</h2>
                {upcomingLoading ? (
                    <p style={{ textAlign: 'center' }}>Loading upcoming hackathons...</p>
                ) : (
                    <div className="marquee-container">
                        <div className="marquee-content">
                            {[...displayHackathons, ...displayHackathons].map((hackathon, index) => (
                                <motion.div
                                    key={`${hackathon._id}-${index}`}
                                    className="upcoming-hackathon-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid #e0e0e0'
                                    }}
                                >
                                    {/* Poster Image */}
                                    <div style={{ height: '200px', overflow: 'hidden', background: '#f5f5f5', cursor: 'pointer' }}
                                        onClick={() => setSelectedPoster({
                                            url: hackathon.posterPath ? (hackathon.posterPath.startsWith('/') ? hackathon.posterPath : `http://localhost:5000/${hackathon.posterPath.replace(/\\/g, '/')}`) : null,
                                            title: hackathon.title
                                        })}>
                                        <img
                                            src={hackathon.posterPath ? (hackathon.posterPath.startsWith('/') ? hackathon.posterPath : `http://localhost:5000/${hackathon.posterPath.replace(/\\/g, '/')}`) : ''}
                                            alt={hackathon.title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                transition: 'transform 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIFBvc3RlciBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                                            }}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '25px' }}>
                                        <h3 style={{ color: '#830000', margin: '0 0 15px 0', fontSize: '1.4rem', fontWeight: '700' }}>
                                            {hackathon.title}
                                        </h3>

                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Organization:</strong> {hackathon.organization}
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Mode:</strong> {hackathon.mode}
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Date:</strong> {new Date(hackathon.hackathonDate).toLocaleDateString()}
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#d32f2f', fontWeight: '600' }}>
                                                <strong>Registration Deadline:</strong> {new Date(hackathon.registrationDeadline).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
                                            {hackathon.description.length > 150
                                                ? hackathon.description.substring(0, 150) + '...'
                                                : hackathon.description}
                                        </p>

                                        {user && user.role === 'student' && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => navigate(`/enroll/${hackathon._id}`)}
                                                    style={{
                                                        background: '#830000',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '12px 15px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        flex: 1,
                                                        transition: 'background 0.3s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = '#a52a2a'}
                                                    onMouseLeave={(e) => e.target.style.background = '#830000'}
                                                >
                                                    Enroll Individual
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/team-matching/${hackathon._id}`)}
                                                    style={{
                                                        background: 'white',
                                                        color: '#830000',
                                                        border: '2px solid #830000',
                                                        padding: '12px 15px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        flex: 1,
                                                        transition: 'all 0.3s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = '#830000';
                                                        e.target.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'white';
                                                        e.target.style.color = '#830000';
                                                    }}
                                                >
                                                    Team Matching
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.section>

            <motion.section
                className="approved-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
            >
                <h2>Completed Hackathons</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : Object.keys(groupedByStudent).length === 0 ? (
                    <p className="no-data">No approved hackathons to display yet.</p>
                ) : (
                    <>
                        {['1st', '2nd', '3rd', '4th'].map((year) => {
                            // Filter students by year
                            const yearStudents = Object.values(groupedByStudent).filter(
                                ({ student }) => student.year === year
                            );

                            if (yearStudents.length === 0) return null;

                            return (
                                <div key={year} className="year-section">
                                    <h3 className="year-heading">{year} Year</h3>
                                    <div className="table-responsive">
                                        <table className="hackathon-table">
                                            <thead>
                                                <tr>
                                                    <th>Register No</th>
                                                    <th>Student Name</th>
                                                    <th>Department</th>
                                                    <th>Year</th>
                                                    <th>Hackathons</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {yearStudents.map(({ student, hackathons }) => (
                                                    <React.Fragment key={student._id}>
                                                        <tr className={`student-row ${expandedStudentId === student._id ? 'expanded' : ''}`} onClick={() => toggleExpand(student._id)}>
                                                            <td>{student.registerNo}</td>
                                                            <td>{student.name}</td>
                                                            <td>{student.department}</td>
                                                            <td>{student.year}</td>
                                                            <td><span className="badge">{hackathons.length} Approved</span></td>
                                                            <td>
                                                                <button className="expand-btn">
                                                                    {expandedStudentId === student._id ? 'Hide Details' : 'View Details'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {expandedStudentId === student._id && (
                                                            <tr className="details-row">
                                                                <td colSpan="6">
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="details-container"
                                                                    >
                                                                        <h4>Hackathon Details</h4>
                                                                        <div className="details-grid">
                                                                            {hackathons.map(hack => (
                                                                                <div key={hack._id} className="detail-card">
                                                                                    <h5>{hack.hackathonTitle || hack.companyName}</h5>
                                                                                    <p><strong>Organization:</strong> {hack.organization || hack.companyName}</p>
                                                                                    <p><strong>Mode:</strong> {hack.mode}</p>
                                                                                    <p><strong>Date:</strong> {new Date(hack.date || hack.durationFrom).toLocaleDateString()}</p>
                                                                                    <p className="description">{hack.description}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </motion.section>

            {/* Contact Information */}
            <motion.section
                className="contact-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                style={{
                    background: 'white',
                    padding: '40px 20px',
                    borderRadius: '12px',
                    marginTop: '40px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
            >
                <h2 style={{ color: '#830000', marginBottom: '20px' }}>Contact Information</h2>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <img src={tceLogo} alt="TCE Logo" style={{ width: '120px', marginBottom: '15px' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px' }}>Thiagarajar College of Engineering</p>
                    <p>Madurai - 625 015</p>
                    <p>Tamil Nadu, India</p>
                    <p style={{ marginTop: '15px' }}>📞 <strong>+91 452 2482240</strong></p>
                    <p>🌐 <a href="http://www.tce.edu" target="_blank" rel="noopener noreferrer" style={{ color: '#830000', textDecoration: 'none' }}>www.tce.edu</a></p>
                </div>
            </motion.section>

            {/* Poster Modal */}
            {selectedPoster && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        cursor: 'pointer'
                    }}
                    onClick={() => setSelectedPoster(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <button
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                fontSize: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPoster(null);
                            }}
                        >
                            ×
                        </button>
                        <img
                            src={selectedPoster.url}
                            alt={selectedPoster.title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <h3 style={{
                            color: 'white',
                            textAlign: 'center',
                            marginTop: '15px',
                            fontSize: '1.2rem'
                        }}>
                            {selectedPoster.title}
                        </h3>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
