import { initializeApp } from "firebase/app"
import { getAuth } from  'firebase/auth'

const firebaseConfig = {
    apiKey: "AIzaSyAzkZ-D5egdp8yav_Mvd5INp775_Lnqca4",
    authDomain: "whoami-513ed.firebaseapp.com",
    projectId: "whoami-513ed",
    storageBucket: "whoami-513ed.appspot.com",
    messagingSenderId: "735545098402",
    appId: "1:735545098402:web:f4e942e6665affddaf97fb"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

export { app, auth }