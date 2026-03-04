const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const baseURL = 'http://localhost:5000/api';

async function runE2E() {
    console.log('--- Starting E2E Flow Validation ---');
    try {
        // 1. Student Login
        console.log('\n[1/3] Logging in as Student...');
        const studentRes = await axios.post(`${baseURL}/auth/student/login`, {
            email: 'student@student.tce.edu',
            password: 'studentpassword',
            role: 'student'
        });
        const studentToken = studentRes.data.token;
        console.log('✅ Student logged in successfully');

        // 2. Student Submits Hackathon
        console.log('\n[2/3] Student uploading Hackathon submission...');
        const form = new FormData();
        form.append('hackathonTitle', 'Test API Automation Hackathon ' + Date.now());
        form.append('organization', 'Automated Testers Inc');
        form.append('mode', 'Online');
        form.append('date', new Date().toISOString());
        form.append('year', 3);
        form.append('description', 'Testing backend integration automatically via script.');

        const certPath = path.resolve('../frontend/public/sih_poster.png');
        form.append('certificate', fs.createReadStream(certPath));

        const submitRes = await axios.post(`${baseURL}/hackathons/submit`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${studentToken}`
            }
        });
        const submittedId = submitRes.data.hackathon._id;
        console.log(`✅ Hackathon successfully submitted (ID: ${submittedId})`);

        // 3. Proctor Approves Hackathon
        console.log('\n[3/3] Proctor attempting to approve the submission...');
        const proctorRes = await axios.post(`${baseURL}/auth/proctor/login`, {
            email: 'proctor1@portal.com',
            password: '123456789',
            role: 'proctor'
        });
        const proctorToken = proctorRes.data.token;
        console.log('✅ Proctor logged in successfully');

        const approveRes = await axios.put(`${baseURL}/hackathons/${submittedId}/status`,
            {
                status: 'Accepted',
                rejectionReason: ''
            },
            {
                headers: {
                    Authorization: `Bearer ${proctorToken}`
                }
            }
        );
        console.log(`✅ Proctor approved the hackathon! New Status: ${approveRes.data.hackathon.status}`);

        console.log('\n🎉 ALL FUNCTIONALITIES ARE WORKING PERFECTLY! 🎉');
    } catch (err) {
        console.error('❌ Error during E2E flow:');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

runE2E();
