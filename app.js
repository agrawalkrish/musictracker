import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- IMPORT CONFIG ---
import { firebaseConfig } from './config.js'; 
// ---------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let docRef = null;

// Event Listeners
document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// Accordion Logic
document.querySelectorAll('.phase-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('active');
    });
});
document.querySelectorAll('.phase-content').forEach(content => {
    content.addEventListener('click', (e) => e.stopPropagation());
});

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        docRef = doc(db, "trackers", user.uid);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('tracker-app').style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-pic').src = user.photoURL;
        loadData();
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('tracker-app').style.display = 'none';
    }
});

const dailyChecks = document.querySelectorAll('.daily-check');
const roadmapChecks = document.querySelectorAll('.roadmap-check');

async function loadData() {
    if(!docRef) return;
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const today = new Date().toDateString();
            
            if (data.lastLogin === today) {
                dailyChecks.forEach((box, i) => box.checked = data.daily[i]);
            } else {
                await updateDoc(docRef, { daily: [false, false, false, false], lastLogin: today });
                dailyChecks.forEach(box => box.checked = false);
            }

            if(data.roadmap) roadmapChecks.forEach((box, i) => box.checked = data.roadmap[i]);
            document.getElementById('streak-count').innerText = data.streak || 0;
        } else {
            await setDoc(docRef, { daily: [false,false,false,false], roadmap: [], streak: 0, lastLogin: new Date().toDateString() });
        }
        updateVisuals();
    } catch (e) { console.error("Load error:", e); }
}

async function saveData() {
    if(!docRef) return;
    const dailyState = Array.from(dailyChecks).map(box => box.checked);
    const roadmapState = Array.from(roadmapChecks).map(box => box.checked);
    await updateDoc(docRef, { daily: dailyState, roadmap: roadmapState });
    updateVisuals();
}

function updateVisuals() {
    let total = 0, checked = 0;
    document.querySelectorAll('.phase').forEach(phase => {
        const boxes = phase.querySelectorAll('.roadmap-check');
        let pChecked = 0;
        boxes.forEach(b => { if(b.checked) pChecked++; });
        const percent = Math.round((pChecked / boxes.length) * 100);
        phase.querySelector('.phase-percent').innerText = percent + "%";
        phase.querySelector('.progress-bar-fill').style.width = percent + "%";
        total += boxes.length; checked += pChecked;
    });
    document.getElementById('total-progress').innerText = Math.round((checked/total)*100) + "%";
}

dailyChecks.forEach(box => box.addEventListener('change', saveData));
roadmapChecks.forEach(box => box.addEventListener('change', saveData));