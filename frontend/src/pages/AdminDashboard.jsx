import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UserManagement from '../components/UserManagement';
import OpportunityManager from '../components/OpportunityManager';
import './Dashboard.css';

const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('/')) return path;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}/${path.replace(/\\/g, '/')}`;
};

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [hackathons, setHackathons] = useState([]); // Accepted hackathons
    const [allHackathons, setAllHackathons] = useState([]); // All hackathons for management
    const [upcomingHackathons, setUpcomingHackathons] = useState([]);
    const [lowParticipationStudents, setLowParticipationStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alerting, setAlerting] = useState(false);

    // Interactive Card States
    const [expandedCard, setExpandedCard] = useState(null);
    const [hackathonFilter, setHackathonFilter] = useState('All');
    const [eventTypeFilter, setEventTypeFilter] = useState('All');
    const [attendanceFilter, setAttendanceFilter] = useState('All');
    const [achievementFilter, setAchievementFilter] = useState('All');

    // Upcoming hackathon form states
    const [showUpcomingForm, setShowUpcomingForm] = useState(false);
    const [upcomingForm, setUpcomingForm] = useState({
        title: '',
        organization: '',
        description: '',
        registrationDeadline: '',
        hackathonDate: '',
        mode: 'Online',
        location: '',
        maxParticipants: 100
    });
    const [posterFile, setPosterFile] = useState(null);
    const [submittingUpcoming, setSubmittingUpcoming] = useState(false);

    // User management states
    const [activeTab, setActiveTab] = useState('overview');
    const [students, setStudents] = useState([]);
    const [proctors, setProctors] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [userStats, setUserStats] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, hackathonsRes, lowParticipationRes, upcomingRes, allHackathonsRes] = await Promise.all([
                    API.get('/admin/stats'),
                    API.get('/hackathons/accepted'),
                    API.get('/admin/low-participation'),
                    API.get('/upcoming-hackathons'),
                    API.get('/hackathons/all')
                ]);
                setStats(statsRes.data);
                setHackathons(hackathonsRes.data);
                setLowParticipationStudents(lowParticipationRes.data);
                setUpcomingHackathons(upcomingRes.data);
                setAllHackathons(allHackathonsRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch users when user management tab is active
    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const [studentsRes, proctorsRes, adminsRes, userStatsRes] = await Promise.all([
                API.get('/users/students'),
                API.get('/users/proctors'),
                API.get('/users/admins'),
                API.get('/users/stats')
            ]);
            setStudents(studentsRes.data);
            setProctors(proctorsRes.data);
            setAdmins(adminsRes.data);
            setUserStats(userStatsRes.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleEditUser = (user, type) => {
        setEditingUser({ ...user, type });
        setEditForm({ ...user });
    };

    const handleUpdateUser = async () => {
        try {
            const { type, _id } = editingUser;
            await API.put(`/users/${type}s/${_id}`, editForm);
            setEditingUser(null);
            setEditForm({});
            fetchUsers();
            alert('User updated successfully!');
        } catch (error) {
            alert('Failed to update user: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteUser = async (user, type) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
        try {
            await API.delete(`/users/${type}s/${user._id}`);
            fetchUsers();
            alert('User deleted successfully!');
        } catch (error) {
            alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleSendAlerts = async () => {
        setAlerting(true);
        try {
            await API.post('/admin/send-participation-alerts');
            alert('Alert emails sent successfully to students with low participation!');
        } catch (error) {
            alert('Failed to send alerts: ' + (error.response?.data?.message || error.message));
        } finally {
            setAlerting(false);
        }
    };

    // Export Functionality
    const exportToCSV = (data, filename, type) => {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        const csvRows = [];
        let headers = [];
        let processRow = null;

        if (type === 'hackathons') {
            headers = ['Title', 'Type', 'Student Name', 'Register No', 'Department', 'Year', 'Organization', 'Date', 'Attendance', 'Achievement', 'Status', 'Proctor'];
            processRow = (h) => [
                h.hackathonTitle,
                h.eventType || 'Hackathon',
                h.studentId?.name || '',
                h.studentId?.registerNo || '',
                h.studentId?.department || '',
                h.studentId?.year || '',
                h.organization,
                new Date(h.date).toLocaleDateString(),
                h.attendanceStatus || '',
                h.achievementLevel || '',
                h.status,
                h.proctorId?.name || 'Unassigned'
            ];
        } else if (type === 'upcoming') {
            headers = ['Title', 'Organization', 'Date', 'Registration Deadline', 'Mode', 'Location', 'Max Participants'];
            processRow = (h) => [
                h.title,
                h.organization,
                new Date(h.hackathonDate).toLocaleDateString(),
                new Date(h.registrationDeadline).toLocaleDateString(),
                h.mode,
                h.location || 'N/A',
                h.maxParticipants
            ];
        } else if (type === 'students') {
            headers = ['Name', 'Email', 'Register No', 'Department', 'Year', 'Hackathons Attended', 'Proctor'];
            processRow = (s) => [
                s.name,
                s.email,
                s.registerNo,
                s.department,
                s.year,
                s.credits, // Still using credits field from DB
                proctors.find(p => p._id === s.proctorId)?.name || 'Unassigned'
            ];
        }

        csvRows.push(headers.join(','));

        data.forEach(row => {
            const values = processRow(row).map(val => {
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Upcoming Hackathon Functions
    const handleUpcomingFormChange = (e) => {
        setUpcomingForm({ ...upcomingForm, [e.target.name]: e.target.value });
    };

    const handlePosterChange = (e) => {
        setPosterFile(e.target.files[0]);
    };

    const handleCreateUpcomingHackathon = async (e) => {
        e.preventDefault();
        setSubmittingUpcoming(true);

        const formData = new FormData();
        Object.keys(upcomingForm).forEach(key => {
            formData.append(key, upcomingForm[key]);
        });
        if (posterFile) {
            formData.append('poster', posterFile);
        }

        try {
            await API.post('/upcoming-hackathons', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Upcoming Hackathon Created Successfully!');
            setShowUpcomingForm(false);
            setUpcomingForm({
                title: '',
                organization: '',
                description: '',
                registrationDeadline: '',
                hackathonDate: '',
                mode: 'Online',
                location: '',
                maxParticipants: 100
            });
            setPosterFile(null);
            // Refresh list
            const res = await API.get('/upcoming-hackathons');
            setUpcomingHackathons(res.data);
        } catch (error) {
            alert('Failed to create upcoming hackathon: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmittingUpcoming(false);
        }
    };

    const handleDeleteUpcomingHackathon = async (hackathonId) => {
        if (!window.confirm('Are you sure you want to delete this upcoming hackathon?')) return;
        try {
            await API.delete(`/upcoming-hackathons/${hackathonId}`);
            const res = await API.get('/upcoming-hackathons');
            setUpcomingHackathons(res.data);
            alert('Deleted successfully');
        } catch (error) {
            alert('Failed to delete upcoming hackathon: ' + (error.response?.data?.message || error.message));
        }
    };

    // Card Interaction Functions
    const toggleExpand = (card) => {
        setExpandedCard(expandedCard === card ? null : card);
    };

    const handleCardClick = (type) => {
        setActiveTab('hackathons');
        if (type === 'pending') setHackathonFilter('Pending');
        else if (type === 'accepted') setHackathonFilter('Accepted');
        else setHackathonFilter('All');
    };

    if (loading) return <div className="dashboard-container"><p>Loading admin data...</p></div>;
    if (!stats) return <div className="dashboard-container"><p>Error loading data.</p></div>;

    // Defensive checks for chart data
    const pieData = [
        { name: 'Online', value: Number(stats.onlineCount) || 0 },
        { name: 'Offline', value: Number(stats.offlineCount) || 0 }
    ];

    const studentData = [
        { name: 'Total Students', value: Number(stats.totalStudents) || 0 },
        { name: 'With Hackathons', value: Number(stats.studentsWithHackathons) || 0 },
        { name: 'Students with Less Participation', value: Number(lowParticipationStudents?.length) || 0 }
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

    // Only render charts if we have valid data
    const hasValidChartData = pieData.some(item => item.value > 0) || studentData.some(item => item.value > 0);

    const getFilteredHackathons = () => {
        let filtered = allHackathons;

        // Filter by status
        if (hackathonFilter !== 'All') {
            filtered = filtered.filter(h => h.status === hackathonFilter);
        }

        // Filter by event type
        if (eventTypeFilter !== 'All') {
            filtered = filtered.filter(h => h.eventType === eventTypeFilter);
        }

        // Filter by attendance
        if (attendanceFilter !== 'All') {
            filtered = filtered.filter(h => h.attendanceStatus === attendanceFilter);
        }

        // Filter by achievement
        if (achievementFilter !== 'All') {
            filtered = filtered.filter(h => h.achievementLevel === achievementFilter);
        }

        return filtered;
    };

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ color: '#830000', margin: 0 }}>Admin Dashboard</h2>
                <Link to="/" style={{ textDecoration: 'none', color: '#830000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Home
                </Link>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px', overflowX: 'auto' }}>
                {[
                    { id: 'overview', label: '    Overview' },
                    { id: 'opportunities', label: '✨ Smart Opportunities' },
                    { id: 'hackathons', label: 'Hackathons' },
                    { id: 'upcoming', label: 'Upcoming Hackathons' },
                    { id: 'users', label: '  User Management' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === tab.id ? '#830000' : '#f5f5f5',
                            color: activeTab === tab.id ? 'white' : '#333',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    {/* Interactive Stats Grid */}
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        {/* Total Students Card */}
                        <div className="stat-card" style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <div onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Total Students</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.totalStudents}</p>
                            </div>
                        </div>

                        {/* Total Hackathons Card */}
                        <div className="stat-card" style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <div onClick={() => handleCardClick('all')} style={{ cursor: 'pointer' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#ef6c00' }}>Total Hackathons</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.totalHackathons}</p>
                            </div>
                            <button
                                onClick={() => toggleExpand('total')}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                {expandedCard === 'total' ? '▲' : '▼'}
                            </button>
                            {expandedCard === 'total' && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '10px' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Recent Submissions:</p>
                                    {allHackathons.slice(0, 3).map(h => (
                                        <div key={h._id} style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{h.hackathonTitle}</span>
                                            <span style={{
                                                color: h.status === 'Accepted' ? 'green' : h.status === 'Declined' ? 'red' : 'orange'
                                            }}>{h.status}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => handleCardClick('all')}
                                        style={{ width: '100%', marginTop: '10px', padding: '5px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        View All
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pending Hackathons Card */}
                        <div className="stat-card" style={{ background: '#fff8e1', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <div onClick={() => handleCardClick('pending')} style={{ cursor: 'pointer' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#fbc02d' }}>Pending</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.pendingHackathons}</p>
                            </div>
                            <button
                                onClick={() => toggleExpand('pending')}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                {expandedCard === 'pending' ? '▲' : '▼'}
                            </button>
                            {expandedCard === 'pending' && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '10px' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Pending Approval:</p>
                                    {allHackathons.filter(h => h.status === 'Pending').slice(0, 3).map(h => (
                                        <div key={h._id} style={{ fontSize: '0.85rem', marginBottom: '5px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{h.hackathonTitle}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#666' }}>{h.studentId?.name}</div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => handleCardClick('pending')}
                                        style={{ width: '100%', marginTop: '10px', padding: '5px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        View All Pending
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Accepted Hackathons Card */}
                        <div className="stat-card" style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <div onClick={() => handleCardClick('accepted')} style={{ cursor: 'pointer' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Accepted</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.acceptedHackathons}</p>
                            </div>
                        </div>

                        {/* Attendance Rate Card */}
                        <div className="stat-card" style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>    Attendance Rate</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{stats.attendanceRate || 0}%</p>
                            <button
                                onClick={() => toggleExpand('attendance')}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                {expandedCard === 'attendance' ? '▲' : '▼'}
                            </button>
                            {expandedCard === 'attendance' && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>  Attended:</span>
                                        <strong>{stats.attendedCount || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>❌ Did Not Attend:</span>
                                        <strong style={{ color: '#d32f2f' }}>{stats.didNotAttendCount || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📝 Registered Only:</span>
                                        <strong>{stats.registeredOnlyCount || 0}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Achievement Breakdown Card */}
                        <div className="stat-card" style={{ background: '#fff9c4', padding: '20px', borderRadius: '8px', position: 'relative' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#f57f17' }}>   Achievements</h3>
                            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{(stats.winnersCount || 0) + (stats.runnerUpsCount || 0)}</p>
                            <button
                                onClick={() => toggleExpand('achievements')}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                {expandedCard === 'achievements' ? '▲' : '▼'}
                            </button>
                            {expandedCard === 'achievements' && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '10px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>   Winners:</span>
                                        <strong style={{ color: '#f57f17' }}>{stats.winnersCount || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>   Runner-ups:</span>
                                        <strong style={{ color: '#01579b' }}>{stats.runnerUpsCount || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📜 Participation:</span>
                                        <strong>{stats.participationOnlyCount || 0}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        {hasValidChartData ? (
                            <>
                                <div className="chart-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <h3>Participation Mode</h3>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="chart-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <h3>Student Engagement</h3>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={studentData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {studentData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '8px' }}>
                                <p>Not enough data to display charts yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="low-credits-section" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ color: '#d32f2f', margin: 0 }}>  Students with Low Participation</h3>
                            <button
                                onClick={handleSendAlerts}
                                disabled={alerting || lowParticipationStudents.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    background: alerting ? '#ccc' : '#d32f2f',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: alerting || lowParticipationStudents.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {alerting ? 'Sending...' : '  Send Alert Emails'}
                            </button>
                        </div>
                        {lowParticipationStudents.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#ffebee' }}>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Department</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Year</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Hackathons Attended</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowParticipationStudents.map(student => (
                                            <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>{student.name}</td>
                                                <td style={{ padding: '12px' }}>{student.email}</td>
                                                <td style={{ padding: '12px' }}>{student.department}</td>
                                                <td style={{ padding: '12px' }}>{student.year}</td>
                                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#d32f2f' }}>{student.credits}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#2e7d32', fontWeight: 'bold' }}>
                                🎉 Great news! All students have sufficient participation.
                            </p>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'opportunities' && <OpportunityManager />}

            {activeTab === 'hackathons' && (
                <div className="list-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>Hackathon Management</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => exportToCSV(getFilteredHackathons(), 'hackathons.csv', 'hackathons')}
                                style={{
                                    padding: '8px 16px',
                                    background: '#2e7d32',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Export CSV
                            </button>
                            <select
                                value={hackathonFilter}
                                onChange={(e) => setHackathonFilter(e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Declined">Declined</option>
                            </select>
                            <select
                                value={eventTypeFilter}
                                onChange={(e) => setEventTypeFilter(e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="All">All Types</option>
                                <option value="Hackathon">Hackathon</option>
                                <option value="Codeathon">Codeathon</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>Title</th>
                                    <th style={{ padding: '12px' }}>Type</th>
                                    <th style={{ padding: '12px' }}>Student</th>
                                    <th style={{ padding: '12px' }}>Date</th>
                                    <th style={{ padding: '12px' }}>Attendance</th>
                                    <th style={{ padding: '12px' }}>Achievement</th>
                                    <th style={{ padding: '12px' }}>Status</th>
                                    <th style={{ padding: '12px' }}>Proctor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredHackathons().map(h => (
                                    <tr key={h._id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>{h.hackathonTitle}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: h.eventType === 'Hackathon' ? '#f3e5f5' : '#e1f5fe',
                                                color: h.eventType === 'Hackathon' ? '#7b1fa2' : '#01579b',
                                                fontWeight: '500'
                                            }}>
                                                {h.eventType}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div>{h.studentId?.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{h.studentId?.registerNo}</div>
                                        </td>
                                        <td style={{ padding: '12px' }}>{new Date(h.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: h.attendanceStatus === 'Attended' ? '#e8f5e9' :
                                                    h.attendanceStatus === 'Registered' ? '#fff8e1' : '#ffebee',
                                                color: h.attendanceStatus === 'Attended' ? '#2e7d32' :
                                                    h.attendanceStatus === 'Registered' ? '#f9a825' : '#c62828'
                                            }}>
                                                {h.attendanceStatus}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: h.achievementLevel === 'Winner' ? '#fff9c4' :
                                                    h.achievementLevel === 'Runner-up' ? '#e1f5fe' : '#f5f5f5',
                                                color: h.achievementLevel === 'Winner' ? '#f57f17' :
                                                    h.achievementLevel === 'Runner-up' ? '#01579b' : '#666'
                                            }}>
                                                {h.achievementLevel}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                background: h.status === 'Accepted' ? '#e8f5e9' : h.status === 'Declined' ? '#ffebee' : '#fff8e1',
                                                color: h.status === 'Accepted' ? '#2e7d32' : h.status === 'Declined' ? '#c62828' : '#f9a825'
                                            }}>
                                                {h.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{h.proctorId?.name || 'Unassigned'}</td>
                                    </tr>
                                ))}
                                {getFilteredHackathons().length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                            No hackathons found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'upcoming' && (
                <div className="upcoming-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3>Upcoming Hackathons</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => exportToCSV(upcomingHackathons, 'upcoming_hackathons.csv', 'upcoming')}
                                style={{
                                    padding: '10px 20px',
                                    background: '#2e7d32',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={() => setShowUpcomingForm(!showUpcomingForm)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#830000',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {showUpcomingForm ? 'Cancel' : 'Create New'}
                            </button>
                        </div>
                    </div>

                    {showUpcomingForm && (
                        <div className="form-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                            <form onSubmit={handleCreateUpcomingHackathon}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input type="text" name="title" value={upcomingForm.title} onChange={handleUpcomingFormChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Organization</label>
                                        <input type="text" name="organization" value={upcomingForm.organization} onChange={handleUpcomingFormChange} required />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label>Description</label>
                                        <textarea name="description" value={upcomingForm.description} onChange={handleUpcomingFormChange} required rows="3" />
                                    </div>
                                    <div className="form-group">
                                        <label>Registration Deadline</label>
                                        <input type="date" name="registrationDeadline" value={upcomingForm.registrationDeadline} onChange={handleUpcomingFormChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Hackathon Date</label>
                                        <input type="date" name="hackathonDate" value={upcomingForm.hackathonDate} onChange={handleUpcomingFormChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Mode</label>
                                        <select name="mode" value={upcomingForm.mode} onChange={handleUpcomingFormChange}>
                                            <option value="Online">Online</option>
                                            <option value="Offline">Offline</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Location (if Offline)</label>
                                        <input type="text" name="location" value={upcomingForm.location} onChange={handleUpcomingFormChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Participants</label>
                                        <input type="number" name="maxParticipants" value={upcomingForm.maxParticipants} onChange={handleUpcomingFormChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Poster Image</label>
                                        <input type="file" accept="image/*" onChange={handlePosterChange} />
                                    </div>
                                </div>
                                <button type="submit" className="submit-btn" disabled={submittingUpcoming} style={{ marginTop: '20px' }}>
                                    {submittingUpcoming ? 'Creating...' : 'Create Hackathon'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="upcoming-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {upcomingHackathons.map(hackathon => (
                            <div key={hackathon._id} className="hackathon-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {hackathon.posterPath && (
                                    <img
                                        src={getFileUrl(hackathon.posterPath)}
                                        alt={hackathon.title}
                                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '15px' }}
                                    />
                                )}
                                <h3>{hackathon.title}</h3>
                                <p><strong>Org:</strong> {hackathon.organization}</p>
                                <p><strong>Date:</strong> {new Date(hackathon.hackathonDate).toLocaleDateString()}</p>
                                <p><strong>Mode:</strong> {hackathon.mode}</p>
                                <button
                                    onClick={() => handleDeleteUpcomingHackathon(hackathon._id)}
                                    style={{
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        width: '100%'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <button
                            onClick={() => exportToCSV(students, 'students.csv', 'students')}
                            style={{
                                padding: '8px 16px',
                                background: '#2e7d32',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Export Students CSV
                        </button>
                    </div>
                    <UserManagement
                        students={students}
                        proctors={proctors}
                        admins={admins}
                        userStats={userStats}
                        onEditUser={handleEditUser}
                        onDeleteUser={handleDeleteUser}
                        editingUser={editingUser}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        onUpdateUser={handleUpdateUser}
                        setEditingUser={setEditingUser}
                    />
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
