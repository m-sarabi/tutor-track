const BASE_PATH = '/tutor-track';

import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    Timestamp,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const appContainer = document.getElementById('app');
let currentUser = null;

// --- AUTHENTICATION --- //

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    handleRouteChange(); // Re-render the app based on auth state
});

const handleSignUp = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            name: user.displayName || 'New Tutor',
            createdAt: Timestamp.now()
        });
    } catch (error) {
        alert(`Sign up failed: ${error.message}`);
    }
};

const handleLogIn = (email, password) => {
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(`Login failed: ${error.message}`));
};

const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .catch(error => alert(`Google Sign-in failed: ${error.message}`));
};

const handleLogOut = () => {
    signOut(auth).catch(error => alert(`Logout failed: ${error.message}`));
};


// --- ROUTING --- //

const routes = {
    '/': 'dashboard',
    '/login': 'login',
    '/signup': 'signup',
    '/student/:id': 'studentDetail'
};

const navigateTo = (path) => {
    // Make sure the path starts with a slash
    const fullPath = `${BASE_PATH}${path.startsWith('/') ? '' : '/'}${path}`;
    window.history.pushState({}, path, window.location.origin + fullPath);
    handleRouteChange();
};

const handleRouteChange = () => {
    // Get the pathname and remove the base path to get the app-specific route
    let path = window.location.pathname.startsWith(BASE_PATH)
        ? window.location.pathname.substring(BASE_PATH.length)
        : window.location.pathname;

    // If the path is empty after stripping the base, it's the root route
    if (path === '') {
        path = '/';
    }

    // Protected routes
    if (!currentUser && path !== '/login' && path !== '/signup') {
        navigateTo('/login');
        return;
    }
    // Redirect logged-in users from auth pages
    if (currentUser && (path === '/login' || path === '/signup')) {
        navigateTo('/');
        return;
    }

    if (path.startsWith('/student/')) {
        const studentId = path.split('/')[2];
        renderStudentDetailPage(studentId);
    } else if (routes[path]) {
        const pageRenderer = `render${routes[path].charAt(0).toUpperCase() + routes[path].slice(1)}Page`;
        window[pageRenderer](); // Dynamically call render function
    } else {
        appContainer.innerHTML = '<h1>404 - Not Found</h1>';
    }
};

window.onpopstate = handleRouteChange;


// --- UI RENDERING --- //

// Render Login Page
window.renderLoginPage = () => {
    appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-screen bg-gray-100">
            <div class="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
                <h3 class="text-2xl font-bold text-center">TutorTrack Login</h3>
                <form id="login-form">
                    <div class="mt-4">
                        <div>
                            <label class="block" for="email">Email</label>
                            <input type="email" placeholder="Email" id="login-email" required
                                class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                        </div>
                        <div class="mt-4">
                            <label class="block">Password</label>
                            <input type="password" placeholder="Password" id="login-password" required
                                class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                        </div>
                        <div class="flex items-baseline justify-between">
                            <button type="submit" class="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900">Login</button>
                        </div>
                        <div class="text-center mt-2">
                            <a href="/signup" data-link class="text-sm text-blue-600 hover:underline">Don't have an account? Sign up</a>
                        </div>
                    </div>
                </form>
                 <div class="relative my-4">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>
                <button id="google-signin-btn" class="w-full px-6 py-2 mt-2 text-white bg-red-600 rounded-lg hover:bg-red-900 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    Sign in with Google
                </button>
            </div>
        </div>
    `;
};

// Render Sign Up Page
window.renderSignupPage = () => {
    appContainer.innerHTML = `
       <div class="flex items-center justify-center min-h-screen bg-gray-100">
            <div class="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
                <h3 class="text-2xl font-bold text-center">Create an Account</h3>
                <form id="signup-form">
                    <div class="mt-4">
                        <div>
                            <label class="block" for="email">Email</label>
                            <input type="email" placeholder="Email" id="signup-email" required
                                class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                        </div>
                        <div class="mt-4">
                            <label class="block">Password</label>
                            <input type="password" placeholder="Password" id="signup-password" required
                                class="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                        </div>
                        <div class="flex">
                            <button type="submit" class="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900">Sign Up</button>
                        </div>
                        <div class="text-center mt-2">
                           <a href="/login" data-link class="text-sm text-blue-600 hover:underline">Already have an account? Log in</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
};

// Render Dashboard
window.renderDashboardPage = () => {
    appContainer.innerHTML = `
        <header class="bg-white shadow-md">
            <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-gray-800">TutorTrack</h1>
                <div>
                    <span class="text-gray-700 mr-4">Welcome, ${currentUser.displayName || currentUser.email}</span>
                    <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
                </div>
            </div>
        </header>
        <main class="container mx-auto px-6 py-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-semibold text-gray-800">My Students</h2>
                <button id="add-student-btn" class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">+ Add Student</button>
            </div>
            <div id="students-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Student cards will be inserted here -->
                <p>Loading students...</p>
            </div>
        </main>
    `;

    // Fetch and display students
    const q = query(collection(db, "students"), where("tutorId", "==", currentUser.uid), where("status", "==", "Active"));
    onSnapshot(q, (querySnapshot) => {
        const studentsList = document.getElementById('students-list');
        if (querySnapshot.empty) {
            studentsList.innerHTML = `<p class="text-gray-500">You haven't added any students yet. Click "Add Student" to get started!</p>`;
            return;
        }
        studentsList.innerHTML = ''; // Clear list
        querySnapshot.forEach((doc) => {
            const student = { id: doc.id, ...doc.data() };
            const studentCard = document.createElement('div');
            studentCard.className = 'bg-white p-6 rounded-lg shadow-md hover:shadow-xl cursor-pointer';
            studentCard.dataset.id = student.id;
            studentCard.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800">${student.name}</h3>
                <p class="text-gray-600">${student.subject}</p>
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-gray-500 uppercase">Upcoming Sessions</h4>
                    ${student.dates && student.dates.length > 0
                ? `<p class="text-gray-700">${student.dates.slice(0, 2).map(d => new Date(d).toLocaleString()).join('<br>')}</p>`
                : `<p class="text-gray-500 text-sm">No upcoming sessions scheduled.</p>`}
                </div>
            `;
            studentCard.addEventListener('click', () => navigateTo(`/student/${student.id}`));
            studentsList.appendChild(studentCard);
        });
    });
};

// Render Student Detail Page
window.renderStudentDetailPage = async (studentId) => {
    appContainer.innerHTML = `<p class="text-center mt-10">Loading student details...</p>`;

    try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists() || studentSnap.data().tutorId !== currentUser.uid) {
            appContainer.innerHTML = '<h1>Error: Student not found, or you do not have access.</h1>';
            return;
        }

        const student = { id: studentSnap.id, ...studentSnap.data() };

        // Render the main page structure
        appContainer.innerHTML = `
            <header class="bg-white shadow-md">
                <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                    <a href="/" data-link class="text-blue-500 hover:underline">&larr; Back to Dashboard</a>
                    <div>
                        <span class="text-gray-700 mr-4">Welcome, ${currentUser.displayName || currentUser.email}</span>
                        <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
                    </div>
                </div>
            </header>
            <main class="container mx-auto px-6 py-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">${student.name}</h2>
                        <p class="text-xl text-gray-600">${student.subject}</p>
                    </div>
                    <div>
                        <button data-action="edit-student" data-id="${student.id}" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2">Edit</button>
                        <button data-action="archive-student" data-id="${student.id}" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Archive</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Left Column: Syllabus Tracker -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-xl font-semibold mb-4">Syllabus Tracker</h3>
                        <ul id="syllabus-list" class="space-y-2">
                           ${renderSyllabus(student.syllabus || [], student.id)}
                        </ul>
                        <form id="add-topic-form" class="mt-4 flex">
                            <input type="text" id="new-topic-title" placeholder="Add new topic" class="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-1" required>
                            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600">Add</button>
                        </form>
                    </div>
                    <!-- Right Column: Session Log -->
                    <div class="bg-white p-6 rounded-lg shadow-md">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-semibold">Session Log</h3>
                            <button data-action="show-log-session-form" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">+ Log Session</button>
                        </div>
                        <div id="session-log-list" class="space-y-4">
                            <!-- Session entries will be loaded here -->
                        </div>
                    </div>
                </div>
            </main>
        `;

        // Fetch and render sessions
        const sessionsQuery = query(collection(db, "sessions"), where("studentId", "==", studentId), orderBy("date", "desc"));
        onSnapshot(sessionsQuery, (querySnapshot) => {
            const sessionLogList = document.getElementById('session-log-list');
            if (querySnapshot.empty) {
                sessionLogList.innerHTML = `<p class="text-gray-500">No sessions logged yet.</p>`;
                return;
            }
            sessionLogList.innerHTML = querySnapshot.docs.map(doc => {
                const session = { id: doc.id, ...doc.data() };
                const topicsCovered = (session.topicsCoveredIds || [])
                    .map(topicId => (student.syllabus || []).find(t => t.id === topicId)?.title)
                    .filter(Boolean)
                    .join(', ');

                return `
                    <div class="border-b pb-4">
                        <p class="font-bold">${session.date.toDate().toLocaleDateString()} - ${session.duration} mins</p>
                        <p class="text-sm mt-2"><strong class="font-semibold">Notes:</strong> ${session.notes}</p>
                        <p class="text-sm mt-1"><strong class="font-semibold">Next Steps:</strong> ${session.nextSteps}</p>
                        <p class="text-sm mt-1"><strong class="font-semibold">Topics:</strong> ${topicsCovered || 'None'}</p>
                    </div>
                `;
            }).join('');
        });

    } catch (error) {
        console.error("Error rendering student page:", error);
        appContainer.innerHTML = `<h1>Something went wrong.</h1>`;
    }
};

const renderSyllabus = (syllabus, studentId) => {
    if (!syllabus || syllabus.length === 0) {
        return `<li class="text-gray-500">No topics added to the syllabus yet.</li>`;
    }
    return syllabus.map(topic => `
        <li class="flex justify-between items-center p-2 rounded hover:bg-gray-50">
            <span>${topic.title}</span>
            <div class="flex items-center space-x-1">
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}" data-status="Not Started" class="status-btn text-xs px-2 py-1 rounded ${topic.status === 'Not Started' ? 'bg-gray-500 text-white' : 'bg-gray-200'}">Not Started</button>
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}" data-status="In Progress" class="status-btn text-xs px-2 py-1 rounded ${topic.status === 'In Progress' ? 'bg-yellow-500 text-white' : 'bg-yellow-100'}">In Progress</button>
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}" data-status="Completed" class="status-btn text-xs px-2 py-1 rounded ${topic.status === 'Completed' ? 'bg-green-500 text-white' : 'bg-green-100'}">Completed</button>
            </div>
        </li>
    `).join('');
};

// --- MODALS --- //
const showModal = (title, content) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">${title}</h2>
                <button data-action="close-modal" class="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
};

const closeModal = () => {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        modal.remove();
    }
};

const showAddStudentModal = () => {
    const content = `
        <form id="add-student-form">
            <div class="mb-4">
                <label class="block text-gray-700">Student Name</label>
                <input type="text" name="name" class="w-full p-2 border rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700">Subject</label>
                <input type="text" name="subject" class="w-full p-2 border rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700">Contact Info (Optional)</label>
                <input type="text" name="contact" class="w-full p-2 border rounded">
            </div>
             <div class="mb-4">
                <label class="block text-gray-700">Scheduled Dates (Optional)</label>
                <input type="datetime-local" name="dates" class="w-full p-2 border rounded" multiple>
                 <small class="text-gray-500">Hold Ctrl/Cmd to select multiple dates.</small>
            </div>
            <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Add Student</button>
        </form>
    `;
    showModal('Add New Student', content);
};

const showLogSessionForm = async () => {
    const studentId = window.location.pathname.split('/')[2];
    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    const student = studentSnap.data();
    const syllabusOptions = (student.syllabus || []).map(topic =>
        `<label class="flex items-center"><input type="checkbox" name="topics" value="${topic.id}" class="mr-2">${topic.title}</label>`
    ).join('');

    const content = `
        <form id="log-session-form" data-student-id="${studentId}">
            <div class="mb-4">
                <label class="block">Date</label>
                <input type="date" name="date" class="w-full p-2 border rounded" required>
            </div>
            <div class="mb-4">
                <label class="block">Duration (minutes)</label>
                <input type="number" name="duration" class="w-full p-2 border rounded" required>
            </div>
            <div class="mb-4">
                <label class="block">Session Notes</label>
                <textarea name="notes" class="w-full p-2 border rounded" rows="3"></textarea>
            </div>
             <div class="mb-4">
                <label class="block">Topics Covered</label>
                <div class="max-h-32 overflow-y-auto border p-2 rounded">
                    ${syllabusOptions || '<p class="text-sm text-gray-500">No syllabus topics available.</p>'}
                </div>
            </div>
            <div class="mb-4">
                <label class="block">Next Steps / Homework</label>
                <textarea name="nextSteps" class="w-full p-2 border rounded" rows="2"></textarea>
            </div>
            <button type="submit" class="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">Log Session</button>
        </form>
    `;
    showModal('Log New Session', content);
};

const showEditStudentModal = (student) => {
    // Note: Editing multiple datetime-local inputs is tricky.
    // For this minimalist app, we'll ask the user to re-select all dates.
    const content = `
        <form id="edit-student-form" data-id="${student.id}">
            <div class="mb-4">
                <label class="block text-gray-700">Student Name</label>
                <input type="text" name="name" class="w-full p-2 border rounded" value="${student.name}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700">Subject</label>
                <input type="text" name="subject" class="w-full p-2 border rounded" value="${student.subject}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700">Contact Info (Optional)</label>
                <input type="text" name="contact" class="w-full p-2 border rounded" value="${student.contact || ''}">
            </div>
             <div class="mb-4">
                <label class="block text-gray-700">Scheduled Dates (Optional)</label>
                <input type="datetime-local" name="dates" class="w-full p-2 border rounded" multiple>
                 <small class="text-gray-500">Current dates will be replaced. Please re-select all desired dates.</small>
            </div>
            <button type="submit" class="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">Save Changes</button>
        </form>
    `;
    showModal('Edit Student Details', content);
};


// --- EVENT LISTENERS (using event delegation) --- //

document.addEventListener('click', async (e) => {
    const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;

    if (e.target.matches('[data-link]')) {
        e.preventDefault();
        navigateTo(e.target.getAttribute('href'));
    }

    if (e.target.id === 'logout-btn') handleLogOut();
    if (e.target.id === 'google-signin-btn') handleGoogleSignIn();
    if (e.target.id === 'add-student-btn') showAddStudentModal();
    if (action === 'close-modal') closeModal();
    if (action === 'show-log-session-form') showLogSessionForm();

    if (action === 'edit-student') {
        const studentId = e.target.closest('[data-id]').dataset.id;
        const studentRef = doc(db, "students", studentId);
        try {
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                showEditStudentModal({ id: studentSnap.id, ...studentSnap.data() });
            } else {
                alert("Error: Student data could not be found.");
            }
        } catch (error) {
            console.error("Error fetching student for edit:", error);
            alert("Could not fetch student details. Please try again.");
        }
    }

    if (action === 'archive-student') {
        if (confirm('Are you sure you want to archive this student?')) {
            const studentId = e.target.dataset.id;
            const studentRef = doc(db, "students", studentId);
            await updateDoc(studentRef, { status: 'Archived' });
            navigateTo('/');
        }
    }

    if (action === 'update-topic-status') {
        const { studentId, topicId, status } = e.target.closest('[data-action]').dataset;
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        const student = studentSnap.data();

        const updatedSyllabus = student.syllabus.map(topic =>
            topic.id === topicId ? { ...topic, status: status } : topic
        );

        await updateDoc(studentRef, { syllabus: updatedSyllabus });
    }
});

document.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Login
    if (e.target.id === 'login-form') {
        const email = e.target.querySelector('#login-email').value;
        const password = e.target.querySelector('#login-password').value;
        handleLogIn(email, password);
    }

    // Signup
    if (e.target.id === 'signup-form') {
        const email = e.target.querySelector('#signup-email').value;
        const password = e.target.querySelector('#signup-password').value;
        handleSignUp(email, password);
    }

    // Add Student
    if (e.target.id === 'add-student-form') {
        const formData = new FormData(e.target);
        const studentData = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            contact: formData.get('contact'),
            dates: formData.getAll('dates').filter(d => d).map(d => new Date(d).toISOString()),
            tutorId: currentUser.uid,
            status: 'Active',
            syllabus: []
        };
        await addDoc(collection(db, 'students'), studentData);
        closeModal();
    }

    // Edit Student
    if (e.target.id === 'edit-student-form') {
        const studentId = e.target.dataset.id;
        if (!studentId) return;

        const studentRef = doc(db, "students", studentId);
        const formData = new FormData(e.target);

        const updatedData = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            contact: formData.get('contact'),
            // This will replace the entire dates array with the new selection
            dates: formData.getAll('dates').filter(d => d).map(d => new Date(d).toISOString()),
        };

        try {
            await updateDoc(studentRef, updatedData);
            closeModal();
            // After updating, re-render the detail page to show the new data
            renderStudentDetailPage(studentId);
        } catch (error) {
            console.error("Error updating student:", error);
            alert("Failed to update student. Please try again.");
        }
    }

    // Add Syllabus Topic
    if (e.target.id === 'add-topic-form') {
        const studentId = window.location.pathname.split('/')[2];
        const title = e.target.querySelector('#new-topic-title').value;
        if (title) {
            const studentRef = doc(db, "students", studentId);
            await updateDoc(studentRef, {
                syllabus: arrayUnion({
                    id: crypto.randomUUID(), // Simple UUID for topics
                    title: title,
                    status: 'Not Started'
                })
            });
            e.target.reset();
        }
    }

    // Log Session
    if (e.target.id === 'log-session-form') {
        const studentId = e.target.dataset.studentId;
        const formData = new FormData(e.target);
        const sessionData = {
            studentId,
            tutorId: currentUser.uid,
            date: Timestamp.fromDate(new Date(formData.get('date'))),
            duration: Number(formData.get('duration')),
            notes: formData.get('notes'),
            nextSteps: formData.get('nextSteps'),
            topicsCoveredIds: formData.getAll('topics')
        };
        await addDoc(collection(db, 'sessions'), sessionData);
        closeModal();
    }
});

// Initial Load Handler
document.addEventListener('DOMContentLoaded', () => {
    // This handles the redirect from 404.html
    const redirectedPath = sessionStorage.getItem('redirect');
    if (redirectedPath) {
        sessionStorage.removeItem('redirect');
        // Parse the path from the stored URL
        const url = new URL(redirectedPath);
        const path = url.searchParams.get('path');
        if (path) {
            navigateTo(path);
            return;
        }
    }

    // Otherwise, handle the route normally on first load
    handleRouteChange();
});