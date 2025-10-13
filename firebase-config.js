// Import the functions you need from the SDKs you need
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
// import {getAnalytics} from 'firebase/analytics';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: 'AIzaSyAU50xdDnygThs7YIVe7ZDQX-8gwNl3_CI',
    authDomain: 'tutor-track-project.firebaseapp.com',
    projectId: 'tutor-track-project',
    storageBucket: 'tutor-track-project.firebasestorage.app',
    messagingSenderId: '118400684015',
    appId: '1:118400684015:web:5a2f2d43edeef04826f01a',
    measurementId: 'G-15KBKBL838',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);