import React, { useState, useEffect, useCallback, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('/')) return path;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}/${path.replace(/\\/g, '/')}`;
};

const ProctorDashboard = () => {
    const { user } = useContext(AuthContext);
    const [viewMode, setViewMode] = useState('mine'); // 'mine' or 'all'
    const [hackathons, setHackathons] = useState([]);
    const [participationApprovals, setParticipationApprovals] = useState([]);
    const [teamApprovals, setTeamApprovals] = useState([]);
    const [activeSection, setActiveSection] = useState('participation');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageLimit, setPageLimit] = useState(20);
    const [jumpToPage, setJumpToPage] = useState('');

    // Filter state
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedEventType, setSelectedEventType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedAttendance, setSelectedAttendance] = useState('');
    const [selectedAchievement, setSelectedAchievement] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(true);

    // Bulk operations state
    const [selectedHackathons, setSelectedHackathons] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [bulkRejectionReason, setBulkRejectionReason] = useState('');
    const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const [years, setYears] = useState([]);
    const [selectedHackathon, setSelectedHackathon] = useState('');
    const [hackathonTitles, setHackathonTitles] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [showParticipants, setShowParticipants] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [studentHackathons, setStudentHackathons] = useState([]);
    const [showStudentHackathons, setShowStudentHackathons] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [radarOpportunities, setRadarOpportunities] = useState([]);

    const fetchRadarData = async () => {
        try {
            const res = await API.get('/opportunities/proctor-radar');
            setRadarOpportunities(res.data);
        } catch (error) {
            console.error('Radar Fetch Error:', error);
        }
    };

    useEffect(() => {
        if (activeSection === 'radar') {
            fetchRadarData();
        } else if (activeSection === 'teams') {
            fetchTeamApprovals();
        }
    }, [activeSection]);

    const fetchTeamApprovals = async () => {
        try {
            setLoading(true);
            const res = await API.get('/teams/proctor/list');
            setTeamApprovals(res.data);
        } catch (err) {
            console.error('Error fetching team approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    // Error and success handling
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
    }, []);

    const fetchAssignedHackathonsPaginated = useCallback(async (signal) => {
        try {
            setLoading(true);
            setError('');
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('limit', pageLimit);
            params.append('view', viewMode);

            if (selectedYear) params.append('year', selectedYear);
            if (selectedEventType) params.append('eventType', selectedEventType);
            if (selectedStatus) params.append('status', selectedStatus);
            if (selectedAttendance) params.append('attendanceStatus', selectedAttendance);
            if (selectedAchievement) params.append('achievementLevel', selectedAchievement);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await API.get(`/hackathons/assigned/paginated?${params.toString()}`, { signal });

            // Only update if not aborted
            setHackathons(res.data.hackathons);
            setTotalPages(res.data.pagination.totalPages);
            setTotalCount(res.data.pagination.total);
            setSelectedHackathons([]);
            setSelectAll(false);
        } catch (err) {
            if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
                console.error(err);
                setError('Failed to load submissions. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageLimit, viewMode, selectedYear, selectedEventType, selectedStatus, selectedAttendance, selectedAchievement, startDate, endDate]);

    useEffect(() => {
        // Initial data loading
        fetchParticipationApprovals();
        fetchHackathonYears();
        fetchHackathonTitles();

        // Load saved filters
        const savedFilters = localStorage.getItem('proctorFilters');
        if (savedFilters) {
            try {
                const filters = JSON.parse(savedFilters);
                setSelectedYear(filters.selectedYear || '');
                setSelectedEventType(filters.selectedEventType || '');
                setSelectedStatus(filters.selectedStatus || '');
                setSelectedAttendance(filters.selectedAttendance || '');
                setSelectedAchievement(filters.selectedAchievement || '');
                setStartDate(filters.startDate || '');
                setEndDate(filters.endDate || '');
            } catch (e) {
                console.error('Error loading saved filters:', e);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchAssignedHackathonsPaginated(controller.signal);
        return () => controller.abort();
    }, [fetchAssignedHackathonsPaginated]);

    // Save filters to localStorage
    useEffect(() => {
        const filters = {
            selectedYear,
            selectedEventType,
            selectedStatus,
            selectedAttendance,
            selectedAchievement,
            startDate,
            endDate
        };
        localStorage.setItem('proctorFilters', JSON.stringify(filters));
    }, [selectedYear, selectedEventType, selectedStatus, selectedAttendance, selectedAchievement, startDate, endDate]);


    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedHackathons([]);
        } else {
            // Only select pending hackathons that are ASSIGNED to the current user
            const myPendingHackathons = hackathons.filter(h => {
                const isMyStudent = h.studentId?.proctorId?._id === user?._id || h.studentId?.proctorId === user?._id;
                const isMyHackathonAssignment = h.proctorId?._id === user?._id || h.proctorId === user?._id;
                return h.status === 'Pending' && (isMyStudent || isMyHackathonAssignment);
            });

            setSelectedHackathons(myPendingHackathons.map(h => h._id));
        }
        setSelectAll(!selectAll);
    };

    const handleSelectHackathon = (id) => {
        if (selectedHackathons.includes(id)) {
            setSelectedHackathons(selectedHackathons.filter(hId => hId !== id));
        } else {
            setSelectedHackathons([...selectedHackathons, id]);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedHackathons.length === 0) {
            alert('Please select at least one hackathon');
            return;
        }

        if (!window.confirm(`Are you sure you want to approve ${selectedHackathons.length} hackathon(s)?`)) {
            return;
        }

        try {
            await API.put('/hackathons/bulk/status', {
                hackathonIds: selectedHackathons,
                status: 'Accepted'
            });

            alert(`Successfully approved ${selectedHackathons.length} hackathon(s)`);
            fetchAssignedHackathonsPaginated();
        } catch (err) {
            alert('Bulk approve failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleBulkDecline = () => {
        if (selectedHackathons.length === 0) {
            alert('Please select at least one hackathon');
            return;
        }
        setShowBulkRejectModal(true);
    };

    const confirmBulkDecline = async () => {
        if (!bulkRejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        try {
            await API.put('/hackathons/bulk/status', {
                hackathonIds: selectedHackathons,
                status: 'Declined',
                rejectionReason: bulkRejectionReason
            });

            alert(`Successfully declined ${selectedHackathons.length} hackathon(s)`);
            setShowBulkRejectModal(false);
            setBulkRejectionReason('');
            fetchAssignedHackathonsPaginated();
        } catch (err) {
            alert('Bulk decline failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const clearFilters = () => {
        setSelectedYear('');
        setSelectedEventType('');
        setSelectedStatus('');
        setSelectedAttendance('');
        setSelectedAchievement('');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const fetchParticipationApprovals = async () => {
        try {
            const res = await API.get('/upcoming-hackathons/proctor/approvals');
            setParticipationApprovals(res.data);
        } catch (err) {
            console.error('Error fetching participation approvals:', err);
        }
    };

    const fetchHackathonYears = async () => {
        try {
            const res = await API.get('/hackathons/stats');
            const yearList = res.data.map(item => item._id);
            setYears(yearList);
        } catch (err) {
            console.error('Error fetching years:', err);
        }
    };

    const fetchHackathonTitles = async () => {
        try {
            const res = await API.get('/hackathons/accepted');
            const titles = [...new Set(res.data.map(item => item.hackathonTitle))];
            setHackathonTitles(titles);
        } catch (err) {
            console.error('Error fetching titles:', err);
        }
    };

    const fetchHackathonsByYear = async (year) => {
        try {
            const res = await API.get(`/hackathons/by-year?year=${year}`);
            setHackathons(res.data);
        } catch (err) {
            console.error('Error fetching hackathons by year:', err);
        }
    };

    const fetchHackathonParticipants = async (title, year) => {
        try {
            const res = await API.get(`/hackathons/participants?hackathonTitle=${title}&year=${year}`);
            setParticipants(res.data);
            setShowParticipants(true);
        } catch (err) {
            console.error('Error fetching participants:', err);
        }
    };

    const fetchStudentHackathons = async (studentId) => {
        try {
            const res = await API.get(`/hackathons/student/${studentId}`);
            setStudentHackathons(res.data);
            setShowStudentHackathons(true);
        } catch (err) {
            console.error('Error fetching student hackathons:', err);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        if (status === 'Accepted') {
            if (!window.confirm('Are you sure you want to accept this hackathon?')) {
                return;
            }
        }

        if (status === 'Declined' && !rejectionReason) {
            setSelectedId(id);
            return;
        }

        try {
            await API.put(`/hackathons/${id}/status`, { status, rejectionReason });
            setRejectionReason('');
            setSelectedId(null);
            fetchAssignedHackathonsPaginated();
        } catch (err) {
            alert('Update failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleParticipationApproval = async (approvalId, status, reason = '') => {
        try {
            await API.put(`/upcoming-hackathons/proctor/${approvalId}/status`, {
                status,
                rejectionReason: reason
            });

            // Refresh participation approvals
            await fetchParticipationApprovals();

            alert(`Participation request ${status} successfully!`);
        } catch (err) {
            alert('Update failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleTeamApproval = async (teamId, status, reason = '') => {
        try {
            await API.put(`/teams/proctor/status/${teamId}`, {
                status,
                rejectionReason: reason
            });

            // Refresh team approvals
            await fetchTeamApprovals();

            alert(`Team request ${status} successfully!`);
        } catch (err) {
            alert('Update failed: ' + (err.response?.data?.message || err.message));
        }
    };

    // if (loading) return <div className="dashboard-container"><p>Loading assignments...</p></div>;

    return (
        <div className="dashboard-container">
            <h2 style={{ color: '#830000', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Proctor Dashboard</h2>

            {/* Section Navigation - Professional Tab Style */}
            <div style={{
                display: 'flex',
                gap: '2px',
                marginBottom: '20px',
                borderBottom: '2px solid #ddd',
                background: 'white'
            }}>
                <button
                    onClick={() => setActiveSection('participation')}
                    style={{
                        padding: '12px 24px',
                        background: activeSection === 'participation' ? '#fff' : '#f9f9f9',
                        color: activeSection === 'participation' ? '#830000' : '#666',
                        border: 'none',
                        borderBottom: activeSection === 'participation' ? '4px solid #830000' : '4px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                >
                    Participation Approval
                </button>
                <button
                    onClick={() => setActiveSection('certification')}
                    style={{
                        padding: '12px 24px',
                        background: activeSection === 'certification' ? '#fff' : '#f9f9f9',
                        color: activeSection === 'certification' ? '#830000' : '#666',
                        border: 'none',
                        borderBottom: activeSection === 'certification' ? '4px solid #830000' : '4px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                >
                    Certification Verification
                </button>
                <button
                    onClick={() => setActiveSection('teams')}
                    style={{
                        padding: '12px 24px',
                        background: activeSection === 'teams' ? '#fff' : '#f9f9f9',
                        color: activeSection === 'teams' ? '#830000' : '#666',
                        border: 'none',
                        borderBottom: activeSection === 'teams' ? '4px solid #830000' : '4px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                >
                    Team Matching
                </button>
                <button
                    onClick={() => setActiveSection('radar')}
                    style={{
                        padding: '12px 24px',
                        background: activeSection === 'radar' ? '#fff' : '#f9f9f9',
                        color: activeSection === 'radar' ? '#830000' : '#666',
                        border: 'none',
                        borderBottom: activeSection === 'radar' ? '4px solid #830000' : '4px solid transparent',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                >
                    Opportunity Radar
                </button>
            </div>

            {activeSection === 'radar' && (
                <div>
                    <h3 style={{ color: '#830000', marginBottom: '20px', borderLeft: '4px solid #830000', paddingLeft: '10px' }}>Opportunity Radar</h3>
                    <p style={{ color: '#555' }}>These are opportunities where your students have been identified as eligible candidates.</p>

                    {radarOpportunities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '4px', border: '1px dashed #ccc', color: '#666' }}>
                            <p style={{ fontWeight: 'bold' }}>No Data</p>
                            <p>No active opportunities matching your students found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {radarOpportunities.map(opp => (
                                <div key={opp._id} style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e0e0e0', borderLeft: '4px solid #830000' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{opp.title} <span style={{ fontSize: '0.75rem', background: '#eee', padding: '2px 8px', borderRadius: '12px', color: '#555', border: '1px solid #ddd' }}>{opp.type}</span></h4>
                                            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Deadline: {new Date(opp.deadline).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div style={{ background: '#fcfcfc', padding: '15px', borderRadius: '4px', border: '1px solid #eee' }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#444' }}>Eligible Students ({opp.myStudentsInvited.length})</h5>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {opp.myStudentsInvited.map(student => (
                                                <div key={student._id} style={{
                                                    background: student.hasAccepted ? '#e8f5e9' : 'white',
                                                    color: student.hasAccepted ? '#1b5e20' : '#444',
                                                    padding: '6px 14px',
                                                    borderRadius: '4px',
                                                    border: `1px solid ${student.hasAccepted ? '#c8e6c9' : '#ddd'}`,
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontWeight: student.hasAccepted ? '600' : 'normal'
                                                }}>
                                                    {student.name}
                                                    {student.hasAccepted && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Interested</span>}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '15px' }}>
                                            <button
                                                onClick={() => {
                                                    const pending = opp.myStudentsInvited.filter(s => !s.hasAccepted).length;
                                                    alert(`Nudge email sent to ${pending} pending students!`);
                                                }}
                                                style={{ background: '#f57c00', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                                            >
                                                Send Reminder Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'participation' && (
                <div>
                    <h3 style={{ color: '#830000', marginBottom: '20px', borderLeft: '4px solid #830000', paddingLeft: '10px' }}>Participation Approval Requests</h3>
                    {participationApprovals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '4px', border: '1px dashed #ccc', color: '#666' }}>
                            <p>No participation requests pending approval.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {participationApprovals.map(approval => (
                                <div key={approval._id} className="hackathon-card-item" style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h4 style={{ color: '#830000', margin: '0 0 10px 0' }}>
                                                {approval.upcomingHackathonId?.title || 'Hackathon'}
                                            </h4>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Student:</strong> {approval.enrollmentDetails.studentName} ({approval.enrollmentDetails.registerNo})
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Department:</strong> {approval.enrollmentDetails.department} • {approval.enrollmentDetails.year} Year
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Email:</strong> {approval.enrollmentDetails.email}
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                <strong>Phone:</strong> {approval.enrollmentDetails.phone}
                                            </p>
                                        </div>
                                        <span className={`status-badge ${approval.status.toLowerCase()}`} style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            background: approval.status === 'Approved' ? '#e8f5e9' : approval.status === 'Declined' ? '#ffebee' : '#fff3e0',
                                            color: approval.status === 'Approved' ? '#2e7d32' : approval.status === 'Declined' ? '#c62828' : '#ef6c00',
                                            border: `1px solid ${approval.status === 'Approved' ? '#a5d6a7' : approval.status === 'Declined' ? '#ef9a9a' : '#ffe0b2'}`
                                        }}>
                                            {approval.status === 'Pending' ? '⏳ Pending' : approval.status === 'Approved' ? '  Approved' : '❌ Declined'}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <p style={{ margin: '5px 0', color: '#666' }}>
                                            <strong>Experience:</strong> {approval.enrollmentDetails.experience}
                                        </p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>
                                            <strong>Motivation:</strong> {approval.enrollmentDetails.motivation}
                                        </p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>
                                            <strong>Skills:</strong> {approval.enrollmentDetails.skills}
                                        </p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>
                                            <strong>Team Preference:</strong> {approval.enrollmentDetails.teamPreference}
                                        </p>
                                    </div>

                                    {approval.status === 'Pending' && (
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleParticipationApproval(approval._id, 'Approved')}
                                                style={{
                                                    background: '#4caf50',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedId(approval._id);
                                                    setRejectionReason('');
                                                }}
                                                style={{
                                                    background: '#d32f2f',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Decline
                                            </button>
                                            {selectedId === approval._id && (
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Rejection reason..."
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleParticipationApproval(approval._id, 'Declined', rejectionReason)}
                                                        style={{
                                                            background: '#d32f2f',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '8px 16px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Submit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedId(null);
                                                            setRejectionReason('');
                                                        }}
                                                        style={{
                                                            background: '#666',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '8px 16px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'teams' && (
                <div>
                    <h3 style={{ color: '#830000', marginBottom: '20px', borderLeft: '4px solid #830000', paddingLeft: '10px' }}>Team Approval Requests</h3>
                    {loading ? (
                        <p>Loading teams...</p>
                    ) : teamApprovals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '4px', border: '1px dashed #ccc', color: '#666' }}>
                            <p>No team matching requests pending approval.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {teamApprovals.map(team => (
                                <div key={team._id} style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h4 style={{ color: '#830000', margin: '0 0 10px 0' }}>
                                                Team: {team.teamName}
                                            </h4>
                                            <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                                                <strong>Hackathon:</strong> {team.upcomingHackathonId?.title}
                                            </p>
                                            <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                                                <strong>Submitted:</strong> {team.submittedAt ? new Date(team.submittedAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        <span className={`status-badge ${team.status.toLowerCase()}`} style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            background: team.status === 'Approved' ? '#e8f5e9' : team.status === 'Declined' ? '#ffebee' : '#fff3e0',
                                            color: team.status === 'Approved' ? '#2e7d32' : team.status === 'Declined' ? '#c62828' : '#ef6c00',
                                            border: `1px solid ${team.status === 'Approved' ? '#a5d6a7' : team.status === 'Declined' ? '#ef9a9a' : '#ffe0b2'}`
                                        }}>
                                            {team.status}
                                        </span>
                                    </div>

                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Team Members ({team.members.length})</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                            {team.members.map((member, i) => (
                                                <div key={i} style={{ fontSize: '0.85rem', border: '1px solid #eee', padding: '10px', borderRadius: '4px', background: 'white' }}>
                                                    <span style={{ fontWeight: '600' }}>{member.name}</span>
                                                    <br />
                                                    <span style={{ color: '#666' }}>{member.registerNo}</span>
                                                    <div style={{ marginTop: '8px' }}>
                                                        {member.certificatePath ? (
                                                            <a
                                                                href={getFileUrl(member.certificatePath)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}
                                                            >
                                                                📄 View Certificate
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: '#999', fontSize: '0.75rem italic' }}>No certificate</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {team.status === 'Pending Approval' && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleTeamApproval(team._id, 'Approved')}
                                                style={{ background: '#4caf50', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Approve Team
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const reason = prompt('Enter rejection reason:');
                                                    if (reason) handleTeamApproval(team._id, 'Declined', reason);
                                                }}
                                                style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'certification' && (
                <div>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ background: '#e0e0e0', borderRadius: '20px', padding: '4px', display: 'flex' }}>
                            <button
                                onClick={() => {
                                    setViewMode('mine');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: viewMode === 'mine' ? 'white' : 'transparent',
                                    color: viewMode === 'mine' ? '#830000' : '#666',
                                    fontWeight: viewMode === 'mine' ? '700' : '500',
                                    boxShadow: viewMode === 'mine' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                My Students
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('all');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: viewMode === 'all' ? 'white' : 'transparent',
                                    color: viewMode === 'all' ? '#830000' : '#666',
                                    fontWeight: viewMode === 'all' ? '700' : '500',
                                    boxShadow: viewMode === 'all' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                All Students
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Advanced Filters</h3>
                            <button
                                onClick={clearFilters}
                                style={{
                                    padding: '8px 16px',
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Clear All Filters
                            </button>
                        </div>

                        {/* Row 1: Basic Filters */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value=''>All Years</option>
                                    {years.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Event Type</label>
                                <select
                                    value={selectedEventType}
                                    onChange={(e) => {
                                        setSelectedEventType(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value=''>All Types</option>
                                    <option value='Hackathon'>Hackathon</option>
                                    <option value='Codeathon'>Codeathon</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Status</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value=''>All Status</option>
                                    <option value='Pending'>Pending</option>
                                    <option value='Accepted'>Accepted</option>
                                    <option value='Declined'>Declined</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Attendance</label>
                                <select
                                    value={selectedAttendance}
                                    onChange={(e) => {
                                        setSelectedAttendance(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value=''>All</option>
                                    <option value='Attended'>Attended</option>
                                    <option value='Registered'>Registered</option>
                                    <option value='Did Not Attend'>Did Not Attend</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Date Range & Achievement */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Achievement</label>
                                <select
                                    value={selectedAchievement}
                                    onChange={(e) => {
                                        setSelectedAchievement(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value=''>All</option>
                                    <option value='Winner'>Winner</option>
                                    <option value='Runner-up'>Runner-up</option>
                                    <option value='Participation'>Participation</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Items Per Page</label>
                                <select
                                    value={pageLimit}
                                    onChange={(e) => {
                                        setPageLimit(parseInt(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {/* Filter Summary and Loading State */}
                        <div style={{ marginTop: '15px', padding: '10px', background: 'white', borderRadius: '4px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>Showing:</strong> {hackathons.length} of {totalCount} submissions
                                {selectedYear && ` • Year: ${selectedYear}`}
                                {selectedEventType && ` • Type: ${selectedEventType}`}
                                {selectedStatus && ` • Status: ${selectedStatus}`}
                                {selectedAttendance && ` • Attendance: ${selectedAttendance}`}
                                {selectedAchievement && ` • Achievement: ${selectedAchievement}`}
                                {(startDate || endDate) && ` • Date Range: ${startDate || '...'} to ${endDate || '...'}`}
                            </div>
                            {loading && (
                                <div style={{ color: '#830000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #830000', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                                    Updating...
                                </div>
                            )}
                        </div>
                        <style>{`
                            @keyframes spin {
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>

                    {/* Bulk Operations Bar */}
                    {selectedHackathons.length > 0 && (
                        <div style={{
                            background: '#e3f2fd',
                            padding: '15px 20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: '2px solid #2196f3'
                        }}>
                            <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
                                {selectedHackathons.length} submission(s) selected
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleBulkApprove}
                                    style={{
                                        background: '#4caf50',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Bulk Approve ({selectedHackathons.length})
                                </button>
                                <button
                                    onClick={handleBulkDecline}
                                    style={{
                                        background: '#d32f2f',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Bulk Decline ({selectedHackathons.length})
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedHackathons([]);
                                        setSelectAll(false);
                                    }}
                                    style={{
                                        background: '#666',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="list-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Assigned Hackathons</h3>
                            {hackathons.filter(h => h.status === 'Pending').length > 0 && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span>Select All Pending ({hackathons.filter(h => h.status === 'Pending').length})</span>
                                </label>
                            )}
                        </div>
                        {hackathons.length === 0 ? (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No hackathons assigned to you yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '20px' }}>
                                {hackathons.map(hack => (
                                    <div key={hack._id} className="hackathon-item" style={{
                                        border: '1px solid #ddd',
                                        padding: '20px',
                                        borderRadius: '8px',
                                        background: selectedHackathons.includes(hack._id) ? '#e3f2fd' : '#fff',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        position: 'relative'
                                    }}>
                                        {/* Checkbox for Pending items - Only show if assigned to ME */}
                                        {hack.status === 'Pending' && (
                                            (hack.studentId?.proctorId?._id === user?._id || hack.studentId?.proctorId === user?._id || hack.proctorId?._id === user?._id || hack.proctorId === user?._id) ? (
                                                <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHackathons.includes(hack._id)}
                                                        onChange={() => handleSelectHackathon(hack._id)}
                                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                    />
                                                </div>
                                            ) : null
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', marginLeft: hack.status === 'Pending' ? '40px' : '0' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#333' }}>{hack.studentId?.name}</h4>
                                                <p style={{ margin: 0, color: '#666' }}>Reg No: <strong>{hack.studentId?.registerNo}</strong> | Year: {hack.studentId?.year}</p>
                                                <button
                                                    onClick={() => fetchStudentHackathons(hack.studentId?._id)}
                                                    style={{
                                                        marginTop: '5px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.8rem',
                                                        background: '#666',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    View All Hackathons
                                                </button>
                                            </div>
                                            <span className={`status-${hack.status.toLowerCase()}`} style={{
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                background: hack.status === 'Pending' ? '#fff3cd' : hack.status === 'Accepted' ? '#d4edda' : '#f8d7da',
                                                color: hack.status === 'Pending' ? '#856404' : hack.status === 'Accepted' ? '#155724' : '#721c24',
                                                border: `1px solid ${hack.status === 'Pending' ? '#ffeeba' : hack.status === 'Accepted' ? '#c3e6cb' : '#f5c6cb'}`
                                            }}>
                                                {hack.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                            <div>
                                                <p style={{ margin: '5px 0' }}>
                                                    <strong>Event Type:</strong>
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        padding: '3px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        background: hack.eventType === 'Codeathon' ? '#e3f2fd' : '#fce4ec',
                                                        color: hack.eventType === 'Codeathon' ? '#0277bd' : '#c2185b',
                                                        border: `1px solid ${hack.eventType === 'Codeathon' ? '#90caf9' : '#f48fb1'}`
                                                    }}>
                                                        {hack.eventType || 'Hackathon'}
                                                    </span>
                                                </p>
                                                <p style={{ margin: '5px 0' }}><strong>Title:</strong> {hack.hackathonTitle}</p>
                                                <p style={{ margin: '5px 0' }}><strong>Organization:</strong> {hack.organization}</p>
                                                <p style={{ margin: '5px 0' }}><strong>Mode:</strong> {hack.mode}</p>
                                                <p style={{ margin: '5px 0' }}><strong>Date:</strong> {new Date(hack.date).toLocaleDateString()} ({hack.year})</p>
                                            </div>
                                            <div>
                                                <p style={{ margin: '5px 0' }}><strong>Description:</strong></p>
                                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>{hack.description}</p>
                                            </div>
                                        </div>

                                        <div className="file-links" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                            {hack.attendanceStatus === 'Attended' && hack.certificateFilePath ? (
                                                <a href={getFileUrl(hack.certificateFilePath)} target="_blank" rel="noopener noreferrer" className="file-link" style={{
                                                    textDecoration: 'none',
                                                    color: '#0056b3',
                                                    fontWeight: '600',
                                                    padding: '6px 12px',
                                                    border: '1px solid #0056b3',
                                                    borderRadius: '4px',
                                                    display: 'inline-block'
                                                }}>
                                                    View Certificate
                                                </a>
                                            ) : (
                                                <span style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                    {hack.attendanceStatus === 'Registered' ? 'Registered Only (No Certificate)' : 'No Certificate Available'}
                                                </span>
                                            )}
                                        </div>

                                        {hack.status === 'Pending' && (
                                            <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                {/* Allow approval only if it's the assigned proctor */}
                                                {(hack.studentId?.proctorId?._id === user?._id || hack.studentId?.proctorId === user?._id || hack.proctorId?._id === user?._id || hack.proctorId === user?._id) ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(hack._id, 'Accepted')}
                                                            className="accept-btn"
                                                            style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(hack._id, 'Declined')}
                                                            className="decline-btn"
                                                            style={{ background: '#c62828', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            Decline
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span style={{
                                                        padding: '6px 12px',
                                                        background: '#f8f9fa',
                                                        color: '#6c757d',
                                                        borderRadius: '4px',
                                                        fontSize: '0.85rem',
                                                        border: '1px solid #dee2e6',
                                                        display: 'inline-block',
                                                        fontWeight: '600'
                                                    }}>
                                                        Assigned to {hack.studentId?.proctorId?.name || hack.proctorId?.name || 'Another Proctor'}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {selectedId === hack._id && (
                                            <div className="rejection-input" style={{ marginTop: '15px', background: '#ffebee', padding: '15px', borderRadius: '8px' }}>
                                                <p style={{ margin: '0 0 10px 0', color: '#c62828', fontWeight: 'bold' }}>Reason for Rejection:</p>
                                                <textarea
                                                    placeholder="Enter reason..."
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ef9a9a' }}
                                                />
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleStatusUpdate(hack._id, 'Declined')}
                                                        style={{ background: '#c62828', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        Confirm Reject
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedId(null); setRejectionReason(''); }}
                                                        style={{ background: '#666', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Modal */}
            {showParticipants && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Participants: {selectedHackathon} ({selectedYear})</h3>
                        {participants.length === 0 ? (
                            <p>No participants found.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {participants.map(participant => (
                                    <div key={participant._id} style={{
                                        border: '1px solid #ddd',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        background: '#f9f9f9'
                                    }}>
                                        <p><strong>{participant.studentId?.name}</strong> ({participant.studentId?.registerNo})</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Department: {participant.studentId?.department}</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Email: {participant.studentId?.email}</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Status: {participant.status}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => setShowParticipants(false)}
                            style={{
                                marginTop: '20px',
                                padding: '10px 20px',
                                background: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Student Hackathons Modal */}
            {showStudentHackathons && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Student's Hackathons</h3>
                        {studentHackathons.length === 0 ? (
                            <p>No hackathons found for this student.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {studentHackathons.map(hack => (
                                    <div key={hack._id} style={{
                                        border: '1px solid #ddd',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        background: '#f9f9f9'
                                    }}>
                                        <p><strong>{hack.hackathonTitle}</strong></p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Organization: {hack.organization}</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Date: {new Date(hack.date).toLocaleDateString()} ({hack.year})</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Mode: {hack.mode}</p>
                                        <p style={{ margin: '5px 0', color: '#666' }}>Status: {hack.status}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => setShowStudentHackathons(false)}
                            style={{
                                marginTop: '20px',
                                padding: '10px 20px',
                                background: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Reject Modal */}
            {showBulkRejectModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Bulk Decline Submissions</h3>
                        <p>You are about to decline <strong>{selectedHackathons.length}</strong> submission(s).</p>
                        <p style={{ marginBottom: '15px' }}>Please provide a reason:</p>
                        <textarea
                            value={bulkRejectionReason}
                            onChange={(e) => setBulkRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                marginBottom: '20px',
                                fontSize: '1rem'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowBulkRejectModal(false);
                                    setBulkRejectionReason('');
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBulkDecline}
                                style={{
                                    padding: '10px 20px',
                                    background: '#d32f2f',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Confirm Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Controls - Global */}
            {activeSection === 'certification' && totalPages > 1 && (
                <div style={{
                    marginTop: '30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    background: '#f9f9f9',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Page {currentPage} of {totalPages} • Showing {hackathons.length} of {totalCount} submissions
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 12px',
                                background: currentPage === 1 ? '#ccc' : '#830000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            First
                        </button>

                        <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 12px',
                                background: currentPage === 1 ? '#ccc' : '#830000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ← Previous
                        </button>

                        {/* Page Numbers */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = idx + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = idx + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + idx;
                                } else {
                                    pageNum = currentPage - 2 + idx;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        style={{
                                            padding: '8px 12px',
                                            background: currentPage === pageNum ? '#830000' : 'white',
                                            color: currentPage === pageNum ? 'white' : '#830000',
                                            border: '1px solid #830000',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                                            minWidth: '40px'
                                        }}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 12px',
                                background: currentPage === totalPages ? '#ccc' : '#830000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next →
                        </button>

                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 12px',
                                background: currentPage === totalPages ? '#ccc' : '#830000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProctorDashboard;
