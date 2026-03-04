require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Proctor = require('./models/Proctor');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected for Seeding');

        try {
            // Create Admin
            const adminExists = await Admin.findOne({ email: 'admin@portal.com' });
            if (!adminExists) {
                await Admin.create({
                    email: 'admin@portal.com',
                    password: 'adminpassword'
                });
                console.log('Admin created: admin@portal.com / adminpassword');
            } else {
                console.log('Admin already exists');
            }

            // Create Proctor
            const proctorExists = await Proctor.findOne({ email: 'proctor1@portal.com' });
            if (!proctorExists) {
                await Proctor.create({
                    name: 'Dr. Subhashini',
                    email: 'proctor1@portal.com',
                    password: '123456789',
                    department: 'CSBS'
                });
                console.log('Proctor created: proctor@portal.com');
            }

            // Create Second Proctor
            const proctor2Exists = await Proctor.findOne({ email: 'proctor2@portal.com' });
            if (!proctor2Exists) {
                await Proctor.create({
                    name: 'Dr. Priya',
                    email: 'proctor2@portal.com',
                    password: '123456a',
                    department: 'CSBS'
                });
                console.log('Second Proctor created: proctor2@portal.com');
            } else {
                console.log('Proctor already exists');
            }

            // Create Dummy Student
            const Student = require('./models/Student');
            const studentExists = await Student.findOne({ email: 'student@student.tce.edu' });
            if (!studentExists) {
                await Student.create({
                    name: 'Dummy Student',
                    email: 'student@student.tce.edu',
                    password: 'studentpassword',
                    registerNo: '999999',
                    department: 'CSBS',
                    year: '3rd'
                });
                console.log('Student created: student@student.tce.edu / studentpassword');
            } else {
                console.log('Student already exists');
            }
        } catch (error) {
            console.error('Seeding Error:', error);
        }

        process.exit();
    })
    .catch(err => {
        console.error('Connection Error:', err);
        process.exit(1);
    });
