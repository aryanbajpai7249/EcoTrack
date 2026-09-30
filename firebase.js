// Firebase SDK
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getDatabase } from
    "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3vgy-Wflmwz03j_iOWllBgE7obAjeC1w",
    authDomain: "ecotrack-2e954.firebaseapp.com",
    databaseURL: "https://ecotrack-2e954-default-rtdb.firebaseio.com",
    projectId: "ecotrack-2e954",
    storageBucket: "ecotrack-2e954.firebasestorage.app",
    messagingSenderId: "887138636882",
    appId: "1:887138636882:web:3bf4785c27f73ac35cbb8b",
    measurementId: "G-12WJQHMXDM"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Firebase Authentication
const auth = getAuth(app);


// Firebase Realtime Database
const db = getDatabase(app);


// Export
export { app, auth, db };