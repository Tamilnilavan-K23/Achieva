const Hackathon = require('../models/Hackathon');

// Bulk Update Hackathon Status (Proctor)
exports.bulkUpdateHackathonStatus = async (req, res) => {
    try {
        const { hackathonIds, status, rejectionReason } = req.body;

        if (!hackathonIds || !Array.isArray(hackathonIds) || hackathonIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of hackathon IDs' });
        }

        if (!status || !['Accepted', 'Declined'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be Accepted or Declined' });
        }

        // Fetch current proctor to check permissions
        const Proctor = require('../models/Proctor');
        const currentProctor = await Proctor.findById(req.user.id);

        if (!currentProctor) {
            return res.status(403).json({ message: 'Proctor access required' });
        }

        // Fetch all hackathons with student details to verify ownership/department access
        const hackathons = await Hackathon.find({
            _id: { $in: hackathonIds }
        }).populate('studentId');

        if (hackathons.length !== hackathonIds.length) {
            return res.status(404).json({
                message: 'One or more selected hackathons could not be found'
            });
        }

        // Validate access: proctor can only update hackathons for their directly assigned students
        const unauthorizedHackathons = hackathons.filter(h => {
            const student = h.studentId;
            if (!student) return true; // Orphaned record, deny
            // Only allow if student is directly assigned to THIS proctor
            const isAssigned = student.proctorId && student.proctorId.toString() === req.user.id.toString();
            return !isAssigned;
        });

        if (unauthorizedHackathons.length > 0) {
            return res.status(403).json({
                message: `You do not have permission to update ${unauthorizedHackathons.length} of the selected hackathons. They may belong to a different department.`
            });
        }

        const Student = require('../models/Student');
        const { sendEmail, emailTemplates } = require('../services/emailService');

        const calculateCredits = (attendanceStatus, achievementLevel) => {
            if (attendanceStatus === 'Did Not Attend') return 0;
            if (attendanceStatus === 'Registered') return 0;

            switch (achievementLevel) {
                case 'Winner': return 3;
                case 'Runner-up': return 2;
                case 'Participation': return 1;
                default: return 1;
            }
        };

        const results = {
            success: [],
            failed: []
        };

        // Process each hackathon
        for (const hackathon of hackathons) {
            try {
                const previousStatus = hackathon.status;
                hackathon.status = status;

                if (status === 'Declined') {
                    hackathon.rejectionReason = rejectionReason || 'Bulk declined';
                } else {
                    hackathon.rejectionReason = undefined;
                }

                await hackathon.save();

                // Update student credits
                if (previousStatus !== 'Accepted' && status === 'Accepted') {
                    const student = await Student.findById(hackathon.studentId);
                    if (student) {
                        const creditsToAdd = calculateCredits(hackathon.attendanceStatus, hackathon.achievementLevel);
                        student.credits += creditsToAdd;
                        await student.save();
                    }
                } else if (previousStatus === 'Accepted' && status !== 'Accepted') {
                    const student = await Student.findById(hackathon.studentId);
                    if (student && student.credits > 0) {
                        const creditsToRemove = calculateCredits(hackathon.attendanceStatus, hackathon.achievementLevel);
                        student.credits = Math.max(0, student.credits - creditsToRemove);
                        await student.save();
                    }
                }

                // Send email notification
                try {
                    const student = await Student.findById(hackathon.studentId);
                    await sendEmail(
                        emailTemplates.hackathonStatusUpdate(
                            student.name,
                            student.email,
                            hackathon.hackathonTitle,
                            status,
                            rejectionReason,
                            hackathon.eventType
                        )
                    );
                } catch (emailError) {
                    console.error('Email error for hackathon:', hackathon._id, emailError);
                }

                results.success.push(hackathon._id);
            } catch (error) {
                console.error('Error updating hackathon:', hackathon._id, error);
                results.failed.push({ id: hackathon._id, error: error.message });
            }
        }

        res.json({
            message: `Bulk update completed. ${results.success.length} successful, ${results.failed.length} failed`,
            results
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Assigned Hackathons with Pagination
exports.getAssignedHackathonsPaginated = async (req, res) => {
    try {
        const Student = require('../models/Student');
        const Proctor = require('../models/Proctor');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build base filter
        let filter = {};

        // Always filter by directly assigned students only (no cross-proctor visibility)
        const assignedStudents = await Student.find({ proctorId: req.user.id }).select('_id');
        filter.studentId = { $in: assignedStudents.map(s => s._id) };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.eventType) {
            filter.eventType = req.query.eventType;
        }

        if (req.query.year) {
            filter.year = parseInt(req.query.year);
        }

        if (req.query.attendanceStatus) {
            filter.attendanceStatus = req.query.attendanceStatus;
        }

        if (req.query.achievementLevel) {
            filter.achievementLevel = req.query.achievementLevel;
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) {
                filter.date.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.date.$lte = new Date(req.query.endDate);
            }
        }

        // Get total count
        const total = await Hackathon.countDocuments(filter);

        // Get paginated results
        const hackathons = await Hackathon.find(filter)
            .populate({
                path: 'studentId',
                select: 'name registerNo year department proctorId',
                populate: { path: 'proctorId', select: 'name' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            hackathons,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
