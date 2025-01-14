const firebaseConfig = {
    apiKey: "AIzaSyAa4CB8IBY3ykWgTMS7aWGQtVbOTKUNK9A",
    authDomain: "matt-books.firebaseapp.com",
    projectId: "matt-books",
    storageBucket: "matt-books.firebasestorage.app",
    messagingSenderId: "562589785971",
    appId: "1:562589785971:web:bfabb3c405f927c844ef06",
    measurementId: "G-YVGRDC3PJV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Enable persistence
db.enablePersistence()
    .catch((err) => {
        console.error('Firebase persistence error:', err);
    });

console.log('Firebase initialized with auth:', !!auth);
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? `User ${user.uid} logged in` : 'User logged out');
}); 