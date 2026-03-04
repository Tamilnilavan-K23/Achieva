const Student = require('../models/Student');
const Proctor = require('../models/Proctor');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { OAuth2Client } = require('google-auth-library');
const Joi = require('joi');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id, role, registerNo = null) => {
    const payload = { id, role };
    if (registerNo) payload.registerNo = registerNo;
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Student Auth
const studentRegisterSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().pattern(/@student\.tce\.edu$/).required().messages({
        'string.pattern.base': 'Only @student.tce.edu emails are allowed.'
    }),
    password: Joi.string().min(6).required(),
    registerNo: Joi.string().required(),
    department: Joi.string().required(),
    year: Joi.string().valid('1st', '2nd', '3rd', '4th').required()
});

exports.registerStudent = async (req, res) => {
    try {
        // Validate input
        const { error } = studentRegisterSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password, registerNo, department, year } = req.body;

        // Assign to the proctor with fewest students in same department, fallback to any proctor
        const proctors = await Proctor.find({ department });
        let proctor = null;
        if (proctors.length > 0) {
            // Pick the proctor with the least assigned students (load balancing)
            proctor = proctors.reduce((least, p) =>
                (p.assignedStudents.length < least.assignedStudents.length) ? p : least
                , proctors[0]);
        } else {
            // No proctor for this department yet, fallback to proctor1
            proctor = await Proctor.findOne({ email: 'proctor1@portal.com' });
        }

        let proctorId = null;
        if (proctor) {
            proctorId = proctor._id;
        }

        const student = await Student.create({ name, email, password, registerNo, department, year, proctorId });

        if (proctor) {
            if (!proctor.assignedStudents.includes(student._id)) {
                proctor.assignedStudents.push(student._id);
                await proctor.save();
            }
        }

        // Send Welcome Email
        console.log('Sending welcome email to:', email);
        try {
            await sendEmail(emailTemplates.welcome(name, email));
        } catch (emailErr) {
            console.error('Welcome email failed but continuing registration', emailErr);
        }

        res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        const student = await Student.findOne({ email });
        if (!student || !(await student.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        res.json({
            token: generateToken(student._id, 'student', student.registerNo),
            user: { ...student._doc, role: 'student' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Proctor Auth
exports.loginProctor = async (req, res) => {
    try {
        const { email, password } = req.body;
        const proctor = await Proctor.findOne({ email });
        if (!proctor || !(await proctor.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        res.json({
            token: generateToken(proctor._id, 'proctor'),
            user: { ...proctor._doc, role: 'proctor' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin Auth
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin || !(await admin.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        res.json({
            token: generateToken(admin._id, 'admin'),
            user: { ...admin._doc, role: 'admin' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Temporary storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

// Forgot Password - Send Verification Code
exports.forgotPassword = async (req, res) => {
    try {
        const { email, role } = req.body;

        // Find user based on role
        let user;
        let Model;
        if (role === 'student') {
            Model = Student;
        } else if (role === 'proctor') {
            Model = Proctor;
        } else if (role === 'admin') {
            Model = Admin;
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        user = await Model.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }

        // Generate 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code with expiry (10 minutes)
        verificationCodes.set(email, {
            code,
            role,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        // Send email with verification code
        const emailTemplate = {
            from: '"TCE CSBS Hackathon Portal" <no-reply@portal.com>',
            to: email,
            subject: 'Password Reset Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #830000; color: white; padding: 20px; text-align: center;">
                        <h2>Password Reset Request</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>Dear ${user.name},</p>
                        <p>You have requested to reset your password. Use the verification code below:</p>
                        <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <h1 style="color: #830000; font-size: 2.5rem; letter-spacing: 5px; margin: 0;">${code}</h1>
                        </div>
                        <p><strong>This code will expire in 10 minutes.</strong></p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <hr style="margin: 20px 0;">
                        <div style="background: white; padding: 15px; border-left: 4px solid #830000;">
                            <h3 style="margin-top: 0;">Contact Information</h3>
                            <p><strong>Thiagarajar College of Engineering</strong></p>
                            <p>Madurai - 625 015</p>
                            <p>Tamil Nadu, India</p>
                            <p>📞 +91 452 2482240</p>
                            <p>🌐 www.tce.edu</p>
                        </div>
                    </div>
                </div>
            `
        };

        await sendEmail(emailTemplate);

        res.json({ message: 'Verification code sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Reset Password with Verification Code
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword, role } = req.body;

        // Check if code exists and is valid
        const storedData = verificationCodes.get(email);
        if (!storedData) {
            return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
        }

        if (storedData.expiresAt < Date.now()) {
            verificationCodes.delete(email);
            return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
        }

        if (storedData.code !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        if (storedData.role !== role) {
            return res.status(400).json({ message: 'Role mismatch' });
        }

        // Find user and update password
        let Model;
        if (role === 'student') {
            Model = Student;
        } else if (role === 'proctor') {
            Model = Proctor;
        } else if (role === 'admin') {
            Model = Admin;
        }

        const user = await Model.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        await user.save();

        // Delete used code
        verificationCodes.delete(email);

        // Send confirmation email
        const confirmEmail = {
            from: '"TCE CSBS Hackathon Portal" <no-reply@portal.com>',
            to: email,
            subject: 'Password Reset Successful',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #4caf50; color: white; padding: 20px; text-align: center;">
                        <h2>✓ Password Reset Successful</h2>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>Dear ${user.name},</p>
                        <p>Your password has been successfully reset.</p>
                        <p>You can now log in with your new password.</p>
                        <p><strong>If you didn't make this change, please contact support immediately.</strong></p>
                        <hr style="margin: 20px 0;">
                        <div style="background: white; padding: 15px; border-left: 4px solid #830000;">
                            <h3 style="margin-top: 0;">Contact Information</h3>
                            <p><strong>Thiagarajar College of Engineering</strong></p>
                            <p>Madurai - 625 015</p>
                            <p>Tamil Nadu, India</p>
                            <p>📞 +91 452 2482240</p>
                            <p>🌐 www.tce.edu</p>
                        </div>
                    </div>
                </div>
            `
        };

        await sendEmail(confirmEmail);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Google OAuth Login
exports.googleLogin = async (req, res) => {
    try {
        const { credential, role } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required' });
        }

        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error('Google Token Verification Failed:', verifyError);
            return res.status(401).json({ message: 'Invalid Google Token' });
        }

        const { email, name, picture, email_verified, sub: googleId } = payload;

        if (!email_verified) {
            return res.status(400).json({ message: 'Please use a verified Google account' });
        }

        // Determine which model to use based on role
        let Model;
        if (role === 'student') {
            Model = Student;
            if (!email.endsWith('@student.tce.edu')) {
                return res.status(400).json({ message: 'Students must use @student.tce.edu email' });
            }
        } else if (role === 'proctor') {
            Model = Proctor;
        } else if (role === 'admin') {
            Model = Admin;
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if user exists
        let user = await Model.findOne({ email });

        if (!user) {
            // Create new user for Google sign-in
            if (role === 'student') {
                const tempRegNo = `GOOGLE${Date.now().toString().slice(-6)}`;
                user = await Student.create({
                    name,
                    email,
                    password: Math.random().toString(36).slice(-12),
                    registerNo: tempRegNo,
                    department: 'CSBS',
                    year: '1st',
                    googleId: googleId,
                    profilePicture: picture,
                    verified: true // Google users are verified implicitly
                });

                // Assign Proctor for Google Login students (Defaulting to CSBS)
                const proctor = await Proctor.findOne({ email: 'proctor1@portal.com' });
                if (proctor) {
                    user.proctorId = proctor._id;
                    await user.save();
                    proctor.assignedStudents.push(user._id);
                    await proctor.save();
                }

                try {
                    await sendEmail(emailTemplates.welcome(name, email));
                } catch (emailError) {
                    console.error('Welcome email failed:', emailError);
                }
            } else {
                return res.status(403).json({
                    message: `${role.charAt(0).toUpperCase() + role.slice(1)} account not found. Please contact administrator.`
                });
            }
        }

        // Generate token and return user
        const token = generateToken(user._id, role, user.registerNo);

        res.json({
            token,
            user: { ...user._doc, role }
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
};
