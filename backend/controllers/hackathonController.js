const Hackathon = require('../models/Hackathon');
const Student = require('../models/Student');
const Proctor = require('../models/Proctor');
const ParticipationApproval = require('../models/ParticipationApproval');
const { sendEmail, emailTemplates } = require('../services/emailService');

// Submit Hackathon
exports.submitHackathon = async (req, res) => {
    try {
        const { hackathonTitle, organization, mode, date, year, description, upcomingHackathonId, attendanceStatus, achievementLevel, certificateType, eventType } = req.body;
        const certificateFilePath = req.files['certificate'] ? req.files['certificate'][0].path : null;

        // Certificate is required only if attendance status is 'Attended'
        if (attendanceStatus === 'Attended' && !certificateFilePath) {
            return res.status(400).json({ message: 'Certificate file is required for attended hackathons' });
        }

        // If submitting for an upcoming hackathon, verify approval
        if (upcomingHackathonId) {
            const approval = await ParticipationApproval.findOne({
                studentId: req.user.id,
                upcomingHackathonId,
                status: 'Approved'
            });

            if (!approval) {
                return res.status(403).json({ message: 'You do not have approval to submit for this hackathon' });
            }
        }

        // Create new hackathon submission
        const hackathon = await Hackathon.create({
            studentId: req.user.id,
            eventType: eventType || 'Hackathon',
            hackathonTitle: hackathonTitle.trim(),
            organization: organization.trim(),
            mode,
            date: new Date(date),
            year: parseInt(year),
            description: description.trim(),
            certificateFilePath: certificateFilePath || undefined, // Optional
            upcomingHackathonId: upcomingHackathonId || undefined,
            attendanceStatus: attendanceStatus || 'Attended',
            achievementLevel: achievementLevel || 'Participation',
            certificateType: certificateType || 'Participation Certificate'
        });

        const student = await Student.findById(req.user.id);
        // Use student's already-assigned proctor. If not yet assigned, do load-balanced assignment.
        let proctor = null;
        if (student.proctorId) {
            proctor = await Proctor.findById(student.proctorId);
        }
        if (!proctor) {
            // Load-balanced assignment among proctors of same department
            const proctors = await Proctor.find({ department: student.department });
            if (proctors.length > 0) {
                proctor = proctors.reduce((least, p) =>
                    (p.assignedStudents.length < least.assignedStudents.length) ? p : least
                    , proctors[0]);
            } else {
                proctor = await Proctor.findOne({ email: 'proctor1@portal.com' });
            }
        }

        if (proctor) {
            hackathon.proctorId = proctor._id;
            await hackathon.save();

            // Make sure the student is also assigned to this proctor
            if (!student.proctorId || student.proctorId.toString() !== proctor._id.toString()) {
                student.proctorId = proctor._id;
                await student.save();
            }

            // Add to proctor's assigned students if not already there
            if (!proctor.assignedStudents.includes(student._id)) {
                proctor.assignedStudents.push(student._id);
                await proctor.save();
            }
        } else {
            console.warn(`No proctor found at all for student: ${student.email}`);
        }

        // Send Email Notification to Student
        console.log('Sending hackathon submission confirmation email to:', student.email);
        const emailResult = await sendEmail(emailTemplates.hackathonSubmitted(student.name, student.email, hackathonTitle, hackathon.eventType));

        if (!emailResult.success) {
            console.error('Hackathon submission confirmation email failed');
        }

        res.status(201).json({ message: 'Hackathon submitted successfully', hackathon });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error - this should only happen if the same student tries to submit the same hackathon twice
            res.status(400).json({ message: 'You have already submitted this hackathon for the specified year' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Get Student Hackathons
exports.getMyHackathons = async (req, res) => {
    try {
        const hackathons = await Hackathon.find({ studentId: req.user.id }).sort({ createdAt: -1 });
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Proctor Assigned Hackathons
exports.getAssignedHackathons = async (req, res) => {
    try {
        // Always show only this proctor's directly assigned students
        const assignedStudents = await Student.find({ proctorId: req.user.id }).select('_id');
        const studentIds = assignedStudents.map(s => s._id);
        const filter = { studentId: { $in: studentIds } };

        const hackathons = await Hackathon.find(filter)
            .populate({
                path: 'studentId',
                select: 'name registerNo year department proctorId',
                // Nested populate to show who the proctor is
                populate: { path: 'proctorId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Approve/Reject Hackathon
exports.updateHackathonStatus = async (req, res) => {
    try {
        console.log('Updating hackathon status for ID:', req.params.id);
        const { status, rejectionReason } = req.body;

        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) {
            return res.status(404).json({ message: 'Hackathon not found' });
        }

        // Strict check: only the student's directly assigned proctor can approve
        const student = await Student.findById(hackathon.studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student record not found' });
        }

        const proctorId = req.user.id.toString();
        const studentProctorId = student.proctorId ? student.proctorId.toString() : null;

        if (!studentProctorId || studentProctorId !== proctorId) {
            console.log('Authorization failed - proctor mismatch');
            console.log('req.user.id:', proctorId, '| student.proctorId:', studentProctorId);
            return res.status(403).json({ message: 'Not authorized: You are not the assigned proctor for this student.' });
        }

        const previousStatus = hackathon.status;
        hackathon.status = status;
        if (status === 'Declined') {
            hackathon.rejectionReason = rejectionReason;
        } else {
            hackathon.rejectionReason = undefined;
        }

        await hackathon.save();
        console.log('Hackathon saved successfully');

        // Calculate credits based on attendance and achievement level
        const calculateCredits = (attendanceStatus, achievementLevel) => {
            if (attendanceStatus === 'Did Not Attend') return 0;
            if (attendanceStatus === 'Registered') return 0;

            // Weighted scoring for attended hackathons
            switch (achievementLevel) {
                case 'Winner': return 3;
                case 'Runner-up': return 2;
                case 'Participation': return 1;
                default: return 1;
            }
        };

        // Update student credits if status changed to Accepted
        if (previousStatus !== 'Accepted' && status === 'Accepted') {
            const student = await Student.findById(hackathon.studentId);
            if (student) {
                const creditsToAdd = calculateCredits(hackathon.attendanceStatus, hackathon.achievementLevel);
                student.credits += creditsToAdd;
                await student.save();
                console.log(`Student credits updated: +${creditsToAdd} (Total: ${student.credits})`);
            }
        }
        // Remove credit if status changed from Accepted to something else
        else if (previousStatus === 'Accepted' && status !== 'Accepted') {
            const student = await Student.findById(hackathon.studentId);
            if (student && student.credits > 0) {
                const creditsToRemove = calculateCredits(hackathon.attendanceStatus, hackathon.achievementLevel);
                student.credits = Math.max(0, student.credits - creditsToRemove);
                await student.save();
                console.log(`Student credits decreased: -${creditsToRemove} (Total: ${student.credits})`);
            }
        }

        // Send Email Notification (try-catch to prevent email errors from breaking the update)
        try {
            const student = await Student.findById(hackathon.studentId);
            console.log('Sending hackathon status update email to:', student.email);
            const emailResult = await sendEmail(
                emailTemplates.hackathonStatusUpdate(student.name, student.email, hackathon.hackathonTitle, status, rejectionReason, hackathon.eventType)
            );

            if (!emailResult.success) {
                console.error('Hackathon status update email failed');
            } else {
                console.log('Email sent successfully');
            }
        } catch (emailError) {
            console.error('Email error (but hackathon was updated):', emailError);
        }

        res.json({ message: `Hackathon ${status}`, hackathon });
    } catch (error) {
        console.error('Error updating hackathon status:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get All Accepted Hackathons (Public)
exports.getAcceptedHackathons = async (req, res) => {
    try {
        const hackathons = await Hackathon.find({ status: 'Accepted' })
            .populate('studentId', 'name registerNo department year')
            .sort({ createdAt: -1 });
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Hackathons (Admin)
exports.getAllHackathons = async (req, res) => {
    try {
        const hackathons = await Hackathon.find()
            .populate('studentId', 'name registerNo department year')
            .populate('proctorId', 'name')
            .sort({ createdAt: -1 });
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Hackathons by Year (for Staff filtering)
exports.getHackathonsByYear = async (req, res) => {
    try {
        const { year } = req.query;
        const filter = year ? { year: parseInt(year) } : {};

        const hackathons = await Hackathon.find(filter)
            .populate('studentId', 'name registerNo year department')
            .sort({ createdAt: -1 });

        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Hackathon Participants
exports.getHackathonParticipants = async (req, res) => {
    try {
        const { hackathonTitle, year } = req.query;

        if (!hackathonTitle || !year) {
            return res.status(400).json({ message: 'Hackathon title and year are required' });
        }

        const participants = await Hackathon.find({
            hackathonTitle: hackathonTitle.trim(),
            year: parseInt(year)
        })
            .populate('studentId', 'name registerNo year department email')
            .sort({ createdAt: -1 });

        res.json(participants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Student's All Hackathons (for Staff view)
exports.getStudentHackathons = async (req, res) => {
    try {
        const { studentId } = req.params;

        const hackathons = await Hackathon.find({ studentId })
            .populate('studentId', 'name registerNo year department')
            .sort({ createdAt: -1 });

        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Hackathon Statistics
exports.getHackathonStats = async (req, res) => {
    try {
        const stats = await Hackathon.aggregate([
            {
                $group: {
                    _id: '$year',
                    totalHackathons: { $sum: 1 },
                    uniqueHackathons: { $addToSet: '$hackathonTitle' },
                    totalParticipants: { $sum: '$participantCount' }
                }
            },
            {
                $addFields: {
                    uniqueHackathonCount: { $size: '$uniqueHackathons' }
                }
            },
            {
                $project: {
                    uniqueHackathons: 0
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Hackathon Names for Autocomplete
exports.getHackathonNames = async (req, res) => {
    try {
        const { query } = req.query;

        let matchStage = {};
        if (query) {
            matchStage = {
                hackathonTitle: { $regex: query, $options: 'i' }
            };
        }

        const hackathonNames = await Hackathon.aggregate([
            { $match: matchStage },
            { $group: { _id: '$hackathonTitle', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { name: '$_id', count: 1, _id: 0 } }
        ]);

        res.json(hackathonNames);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
