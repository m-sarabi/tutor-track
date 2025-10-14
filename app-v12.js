const BASE_PATH = '/tutor-track';
const STATUS = {
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
};
const TOPIC_STATUS = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
};


import {auth, db} from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
    Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

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

        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            name: user.displayName || 'New Tutor',
            createdAt: Timestamp.now(),
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

// --- Helper Functions --- //

const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatDateTimeForInput = (date) => {
    return formatDateTime(date).replace(' ', 'T');
};

// --- ROUTING --- //

const routes = {
    '/': 'dashboard',
    '/login': 'login',
    '/signup': 'signup',
    '/student/:id': 'studentDetail',
    '/archived': 'archivedDashboard',
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

    const pageRenderers = {
        dashboard: renderDashboardPage,
        login: renderLoginPage,
        signup: renderSignupPage,
        archivedDashboard: renderArchivedDashboardPage,
        // studentDetail is handled separately
    };

    if (path.startsWith('/student/')) {
        const studentId = path.split('/')[2];
        renderStudentDetailPage(studentId);
    } else if (routes[path] && pageRenderers[routes[path]]) {
        pageRenderers[routes[path]](); // Dynamically call render function
    } else {
        appContainer.innerHTML = '<h1>404 - Not Found</h1>';
    }
    // closeModal();
};

window.onpopstate = handleRouteChange;


// --- UI RENDERING --- //

// Render Login Page
const renderLoginPage = () => {
    appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
            <div class="px-8 py-10 text-left glass-panel w-full max-w-md">
                <h3 class="text-2xl font-bold text-center text-white">TutorTrack Login</h3>
                <form id="login-form">
                    <div class="mt-4">
                        <div>
                            <label class="block text-gray-200" for="email">Email</label>
                            <input type="email" placeholder="Email" id="login-email" required
                                class="w-full px-4 py-2 mt-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
                        </div>
                        <div class="mt-4">
                            <label class="block text-gray-200">Password</label>
                            <input type="password" placeholder="Password" id="login-password" required
                                class="w-full px-4 py-2 mt-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
                        </div>
                        <div class="flex items-baseline justify-between">
                            <button type="submit" class="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Login</button>
                        </div>
                        <div class="text-center mt-2">
                            <a href="/signup" data-link class="text-sm text-blue-300 hover:underline">Don't have an account? Sign up</a>
                        </div>
                    </div>
                </form>
                 <div class="relative my-4">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-500"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-gray-700/50 text-gray-300 rounded-full">Or continue with</span>
                    </div>
                </div>
                <button id="google-signin-btn" class="w-full px-6 py-2 mt-2 text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center">
                    Sign in with Google
                </button>
            </div>
        </div>
    `;
};

// Render Sign Up Page
const renderSignupPage = () => {
    appContainer.innerHTML = `
       <div class="flex items-center justify-center min-h-screen">
            <div class="px-8 py-10 text-left glass-panel w-full max-w-md">
                <h3 class="text-2xl font-bold text-center text-white">Create an Account</h3>
                <form id="signup-form">
                    <div class="mt-4">
                        <div>
                            <label class="block text-gray-200" for="email">Email</label>
                            <input type="email" placeholder="Email" id="signup-email" required
                                class="w-full px-4 py-2 mt-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
                        </div>
                        <div class="mt-4">
                            <label class="block text-gray-200">Password</label>
                            <input type="password" placeholder="Password" id="signup-password" required
                                class="w-full px-4 py-2 mt-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400">
                        </div>
                        <div class="flex">
                            <button type="submit" class="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Sign Up</button>
                        </div>
                        <div class="text-center mt-2">
                           <a href="/login" data-link class="text-sm text-blue-300 hover:underline">Already have an account? Log in</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
};

// Render Dashboard
const renderDashboardPage = () => {
    appContainer.innerHTML = `
        <header class="glass-panel sticky top-4 mx-4 md:mx-auto max-w-6xl z-10">
            <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-white">TutorTrack</h1>
                <div>
                    <span class="text-gray-200 mr-4">Welcome, ${currentUser.displayName || currentUser.email}</span>
                    <button id="logout-btn" class="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500">Logout</button>
                </div>
            </div>
        </header>
        <main class="container mx-auto px-6 py-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-semibold text-white">My Students</h2>
                <div>
                     <a href="/archived" data-link class="text-blue-300 hover:underline mr-4">View Archived</a>
                     <button id="add-student-btn" class="px-6 py-2 bg-green-500/80 text-white rounded-lg hover:bg-green-500">+ Add Student</button>
                </div>
            </div>
            <div id="students-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Student cards will be inserted here -->
                <p>Loading students...</p>
            </div>
        </main>
    `;

    // Fetch and display students
    const q = query(collection(db, 'students'), where('tutorId', '==', currentUser.uid), where('status', '==', STATUS.ACTIVE));
    onSnapshot(q, (querySnapshot) => {
        const studentsList = document.getElementById('students-list');
        if (studentsList) {
            if (querySnapshot.empty) {
                studentsList.innerHTML = `<div class="glass-panel p-6 col-span-full"><p class="text-gray-200">You haven't added any students yet. Click "Add Student" to get started!</p></div>`;
                return;
            }
            studentsList.innerHTML = ''; // Clear list
            querySnapshot.forEach((doc) => {
                const student = {id: doc.id, ...doc.data()};

                const upcomingDates = (student.dates || [])
                    .map(d => new Date(d))
                    .filter(d => d > new Date())
                    .sort((a, b) => a - b)
                    .map(d => formatDateTime(d));

                const studentCard = document.createElement('div');
                studentCard.className = 'glass-panel p-6 hover:bg-white/20 cursor-pointer';
                studentCard.dataset.id = student.id;
                studentCard.innerHTML = `
                <h3 class="text-xl font-bold text-white">${student.name}</h3>
                <p class="text-gray-300">${student.subject}</p>
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-gray-400 uppercase">Upcoming Sessions</h4>
                    ${upcomingDates.length > 0
                    ? `<p class="text-gray-200">${upcomingDates.slice(0, 2).map(d => d.toLocaleString()).join('<br>')}</p>`
                    : `<p class="text-gray-400 text-sm">No upcoming sessions scheduled.</p>`}
                </div>
            `;
                studentCard.addEventListener('click', () => navigateTo(`/student/${student.id}`));
                studentsList.appendChild(studentCard);
            });
        }
    });
};

// Render Archived Page
const renderArchivedDashboardPage = () => {
    appContainer.innerHTML = `
        <header class="glass-panel sticky top-4 mx-4 md:mx-auto max-w-6xl z-10">
            <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                 <a href="/" data-link class="text-blue-300 hover:underline">&larr; Back to Dashboard</a>
                <div>
                    <span class="text-gray-200 mr-4">Welcome, ${currentUser.displayName || currentUser.email}</span>
                    <button id="logout-btn" class="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500">Logout</button>
                </div>
            </div>
        </header>
        <main class="container mx-auto px-6 py-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-semibold text-white">Archived Students</h2>
            </div>
            <div id="archived-students-list" class="space-y-4">
                <!-- Archived student cards will be inserted here -->
                <p>Loading archived students...</p>
            </div>
        </main>
    `;

    const q = query(collection(db, 'students'), where('tutorId', '==', currentUser.uid), where('status', '==', STATUS.ARCHIVED));
    onSnapshot(q, (querySnapshot) => {
        const studentsList = document.getElementById('archived-students-list');
        if (studentsList) {
            if (querySnapshot.empty) {
                studentsList.innerHTML = `<div class="glass-panel p-6"><p class="text-gray-200">You have no archived students.</p></div>`;
                return;
            }
            studentsList.innerHTML = ''; // Clear list
            querySnapshot.forEach((doc) => {
                const student = {id: doc.id, ...doc.data()};
                const studentCard = document.createElement('div');
                studentCard.className = 'glass-panel p-4 flex justify-between items-center';
                studentCard.dataset.id = student.id;
                studentCard.innerHTML = `
                    <div>
                        <h3 class="text-lg font-bold text-white">${student.name}</h3>
                        <p class="text-gray-300">${student.subject}</p>
                    </div>
                    <div class="space-x-2">
                        <button data-action="restore-student" data-id="${student.id}" class="px-4 py-2 bg-green-500/80 text-white rounded hover:bg-green-500">Restore</button>
                        <button data-action="delete-student" data-id="${student.id}" class="px-4 py-2 bg-red-600/80 text-white rounded hover:bg-red-700">Delete Permanently</button>
                    </div>
                `;
                studentsList.appendChild(studentCard);
            });
        }
    });
};

// Render Student Detail Page
const renderStudentDetailPage = async (studentId) => {
    appContainer.innerHTML = `<p class="text-center mt-10">Loading student details...</p>`;

    try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists() || studentSnap.data().tutorId !== currentUser.uid) {
            appContainer.innerHTML = '<h1>Error: Student not found, or you do not have access.</h1>';
            return;
        }

        const student = {id: studentSnap.id, ...studentSnap.data()};

        // Render the main page structure
        appContainer.innerHTML = `
            <header class="glass-panel sticky top-4 mx-4 md:mx-auto max-w-6xl z-10">
                <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                     <a href="/" data-link class="text-blue-300 hover:underline">&larr; Back to Dashboard</a>
                    <div>
                        <span class="text-gray-200 mr-4">Welcome, ${currentUser.displayName || currentUser.email}</span>
                        <button id="logout-btn" class="px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500">Logout</button>
                    </div>
                </div>
            </header>
            <main class="container mx-auto px-6 py-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-white">${student.name}</h2>
                        <p class="text-xl text-gray-300">${student.subject}</p>
                    </div>
                    <div>
                        <button data-action="edit-student" data-id="${student.id}" class="px-4 py-2 bg-yellow-500/80 text-white rounded hover:bg-yellow-600 mr-2">Edit</button>
                        <button data-action="archive-student" data-id="${student.id}" class="px-4 py-2 bg-gray-500/80 text-white rounded hover:bg-gray-600">Archive</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Column 1: Syllabus & Sessions -->
                    <div class="lg:col-span-1 space-y-8">
                        <div class="glass-panel p-6">
                            <h3 class="text-xl font-semibold mb-4 text-white">Syllabus Tracker</h3>
                            <ul id="syllabus-list" class="space-y-2">
                               <!-- This container will be filled dynamically -->
                            </ul>
                            <form id="add-topic-form" class="mt-4 flex">
                                <input type="text" id="new-topic-title" placeholder="Add new topic" class="flex-grow px-3 py-2 border-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                                <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600">Add</button>
                            </form>
                        </div>
                        <div class="glass-panel p-6">
                            <h3 class="text-xl font-semibold mb-4 text-white">Scheduled Sessions</h3>
                            <ul id="scheduled-sessions-list" class="space-y-2">
                                <!-- Dates will be loaded here -->
                            </ul>
                        </div>
                    </div>

                    <!-- Column 2: Session Log -->
                    <div class="glass-panel p-6 lg:col-span-2">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-semibold text-white">Session Log</h3>
                            <button id="log-session-btn" class="px-4 py-2 bg-green-500/80 text-white rounded hover:bg-green-600">+ Log Session</button>
                        </div>
                        <div id="session-log-list" class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <!-- Session entries will be loaded here -->
                        </div>
                    </div>
                </div>
            </main>
        `;

        document.getElementById('log-session-btn').addEventListener('click', () => {
            showLogSessionForm(student);
        });

        onSnapshot(studentRef, (docSnap) => {
            const updatedStudent = docSnap.data();
            const syllabusListElement = document.getElementById('syllabus-list');
            if (syllabusListElement) {
                syllabusListElement.innerHTML = renderSyllabus(updatedStudent.syllabus || [], studentId);
            }
            const sessionsListElement = document.getElementById('scheduled-sessions-list');
            if (sessionsListElement) {
                const upcomingDates = (updatedStudent.dates || [])
                    .map(d => new Date(d))
                    .filter(d => d > new Date())
                    .sort((a, b) => a - b);

                if (upcomingDates.length === 0) {
                    sessionsListElement.innerHTML = `<li class="text-gray-400">No upcoming sessions.</li>`;
                } else {
                    sessionsListElement.innerHTML = upcomingDates.map(date =>
                        `<li class="p-2 rounded bg-black/20 text-gray-200">${formatDateTime(date)}</li>`,
                    ).join('');
                }
            }
        });

        // Fetch and render sessions
        const sessionsQuery = query(
            collection(db, 'sessions'),
            where('studentId', '==', studentId),
            where('tutorId', '==', currentUser.uid),
            orderBy('date', 'desc'),
        );
        onSnapshot(sessionsQuery, (querySnapshot) => {
            const sessionLogList = document.getElementById('session-log-list');
            if (sessionLogList) {
                if (querySnapshot.empty) {
                    sessionLogList.innerHTML = `<p class="text-gray-300">No sessions logged yet.</p>`;
                    return;
                }
                sessionLogList.innerHTML = querySnapshot.docs.map(doc => {
                    const session = {id: doc.id, ...doc.data()};
                    const topicsCovered = (session.topicsCoveredIds || [])
                        .map(topicId => (student.syllabus || []).find(t => t.id === topicId)?.title)
                        .filter(Boolean)
                        .join(', ');

                    return `
                    <div class="border-b border-white/20 pb-4">
                        <div class="flex justify-between items-start">
                             <div>
                                <p class="font-bold text-white">${session.date.toDate().toLocaleDateString()} - ${session.duration} mins</p>
                             </div>
                             <button data-action="delete-session" data-session-id="${session.id}" class="text-red-400 hover:text-red-600 font-bold text-2xl leading-none">&times;</button>
                        </div>
                        <p class="text-sm mt-2 text-gray-200"><strong class="font-semibold text-gray-100">Notes:</strong> ${session.notes}</p>
                        <p class="text-sm mt-1 text-gray-200"><strong class="font-semibold text-gray-100">Next Steps:</strong> ${session.nextSteps}</p>
                        <p class="text-sm mt-1 text-gray-200"><strong class="font-semibold text-gray-100">Topics:</strong> ${topicsCovered || 'None'}</p>
                    </div>
                `;
                }).join('');
            }
        });

    } catch (error) {
        console.error('Error rendering student page:', error);
        appContainer.innerHTML = `<h1>Something went wrong.</h1>`;
    }
};

const renderSyllabus = (syllabus, studentId) => {
    if (!syllabus || syllabus.length === 0) {
        return `<li class="text-gray-400">No topics added to the syllabus yet.</li>`;
    }
    return syllabus.map(topic => `
        <li class="flex justify-between items-center p-2 rounded hover:bg-black/20 text-gray-200">
            <span class="flex-grow">${topic.title}</span>
            <div class="flex items-center space-x-1 flex-shrink-0 ml-4">
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="Not Started" class="status-btn text-xs px-2 py-1 rounded ${topic.status === TOPIC_STATUS.NOT_STARTED ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-800 opacity-50'}">NS</button>
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="In Progress" class="status-btn text-xs px-2 py-1 rounded ${topic.status === TOPIC_STATUS.IN_PROGRESS ? 'bg-yellow-500 text-white' : 'bg-yellow-200 text-yellow-800 opacity-50'}">IP</button>
                <button data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="Completed" class="status-btn text-xs px-2 py-1 rounded ${topic.status === TOPIC_STATUS.COMPLETED ? 'bg-green-500 text-white' : 'bg-green-200 text-green-800 opacity-50'}">C</button>
                <button data-action="delete-topic" data-student-id="${studentId}" data-topic-id="${topic.id}" class="ml-2 text-red-400 hover:text-red-600 font-bold text-xl">&times;</button>
            </div>
        </li>
    `).join('');
};

// --- MODALS --- //

const showModal = (title, content) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content glass-panel">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-white">${title}</h2>
                <button data-action="close-modal" class="text-red-400 hover:text-red-600 text-4xl font-bold leading-none">&times;</button>
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
                <label class="block text-gray-200">Student Name</label>
                <input type="text" name="name" class="w-full p-2 rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Subject</label>
                <input type="text" name="subject" class="w-full p-2 rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Contact Info (Optional)</label>
                <input type="text" name="contact" class="w-full p-2 rounded">
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Scheduled Dates (Optional)</label>
                <div id="dates-container" class="space-y-2">
                    <!-- Date inputs will be added here dynamically -->
                </div>
                <button type="button" data-action="add-date-input" class="mt-2 text-sm text-blue-300 hover:underline">+ Add another date</button>
            </div>
            <button type="submit" class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Add Student</button>
        </form>
    `;
    showModal('Add New Student', content);
};

const showLogSessionForm = (student) => {
    const studentId = student.id;
    const syllabusOptions = (student.syllabus || []).map(topic =>
        `<label class="flex items-center text-gray-200"><input type="checkbox" name="topics" value="${topic.id}" class="mr-2">${topic.title}</label>`,
    ).join('');

    const content = `
        <form id="log-session-form" data-student-id="${studentId}">
            <div class="mb-4">
                <label class="block text-gray-200">Date</label>
                <input type="date" name="date" class="w-full p-2 rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Duration (minutes)</label>
                <input type="number" name="duration" class="w-full p-2 rounded" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Session Notes</label>
                <textarea name="notes" class="w-full p-2 rounded" rows="3"></textarea>
            </div>
             <div class="mb-4">
                <label class="block text-gray-200">Topics Covered</label>
                <div class="max-h-32 overflow-y-auto border border-white/20 p-2 rounded">
                    ${syllabusOptions || '<p class="text-sm text-gray-400">No syllabus topics available.</p>'}
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Next Steps / Homework</label>
                <textarea name="nextSteps" class="w-full p-2 rounded" rows="2"></textarea>
            </div>
            <button type="submit" class="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">Log Session</button>
        </form>
    `;
    showModal('Log New Session', content);
};

const showEditStudentModal = (student) => {
    const existingDatesHTML = (student.dates || [])
        .map(date => `
            <div class="flex items-center space-x-2 date-input-row">
                <input type="datetime-local" name="dates" class="w-full p-2 rounded" value="${formatDateTimeForInput(new Date(date))}">
                <button type="button" data-action="remove-date-input" class="px-2 py-1 text-red-400 hover:text-red-600 font-bold">&times;</button>
            </div>
        `).join('');

    const content = `
        <form id="edit-student-form" data-id="${student.id}">
            <div class="mb-4">
                <label class="block text-gray-200">Student Name</label>
                <input type="text" name="name" class="w-full p-2 rounded" value="${student.name}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Subject</label>
                <input type="text" name="subject" class="w-full p-2 rounded" value="${student.subject}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-200">Contact Info (Optional)</label>
                <input type="text" name="contact" class="w-full p-2 rounded" value="${student.contact || ''}">
            </div>
             <div class="mb-4">
                <label class="block text-gray-200">Scheduled Dates (Optional)</label>
                <div id="dates-container" class="space-y-2">
                    ${existingDatesHTML}
                </div>
                <button type="button" data-action="add-date-input" class="mt-2 text-sm text-blue-300 hover:underline">+ Add another date</button>
            </div>
            <button type="submit" class="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">Save Changes</button>
        </form>
    `;
    showModal('Edit Student Details', content);
};


// --- EVENT LISTENERS (using event delegation) --- //

document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target && !e.target.matches('[data-link]') && !e.target.id) return;

    const action = target?.dataset.action;

    if (e.target.matches('[data-link]')) {
        e.preventDefault();
        navigateTo(e.target.getAttribute('href'));
    }

    if (e.target.id === 'logout-btn') handleLogOut();
    if (e.target.id === 'google-signin-btn') handleGoogleSignIn();
    if (e.target.id === 'add-student-btn') showAddStudentModal();
    if (action === 'close-modal') closeModal();

    if (action === 'add-date-input') {
        const container = document.getElementById('dates-container');
        if (container) {
            const dateRow = document.createElement('div');
            dateRow.className = 'flex items-center space-x-2 date-input-row';
            dateRow.innerHTML = `
                <input type="datetime-local" name="dates" class="w-full p-2 rounded">
                <button type="button" data-action="remove-date-input" class="px-2 py-1 text-red-400 hover:text-red-600 font-bold">&times;</button>
            `;
            container.appendChild(dateRow);
        }
    }

    if (action === 'remove-date-input') {
        target.closest('.date-input-row').remove();
    }

    if (action === 'edit-student') {
        const studentId = target.closest('[data-id]').dataset.id;
        const studentRef = doc(db, 'students', studentId);
        try {
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                showEditStudentModal({id: studentSnap.id, ...studentSnap.data()});
            } else {
                alert('Error: Student data could not be found.');
            }
        } catch (error) {
            console.error('Error fetching student for edit:', error);
            alert('Could not fetch student details. Please try again.');
        }
    }

    if (action === 'archive-student') {
        if (confirm('Are you sure you want to archive this student?')) {
            const studentId = target.dataset.id;
            const studentRef = doc(db, 'students', studentId);
            await updateDoc(studentRef, {status: STATUS.ARCHIVED});
            navigateTo('/');
        }
    }

    if (action === 'restore-student') {
        const studentId = target.dataset.id;
        const studentRef = doc(db, 'students', studentId);
        try {
            await updateDoc(studentRef, {status: STATUS.ACTIVE});
            // The onSnapshot listener will automatically remove the student from the list
        } catch (error) {
            console.error('Error restoring student: ', error);
            alert('Failed to restore student.');
        }
    }

    if (action === 'delete-student') {
        const studentId = target.dataset.id;
        if (confirm('WARNING: This will permanently delete the student and ALL their session logs. This action cannot be undone. Are you sure?')) {
            try {
                // Step 1: Find and delete all associated sessions
                const sessionsQuery = query(collection(db, 'sessions'), where('studentId', '==', studentId));
                const sessionDocs = await getDocs(sessionsQuery);

                const batch = writeBatch(db);
                sessionDocs.forEach(sessionDoc => {
                    batch.delete(sessionDoc.ref);
                });
                await batch.commit();

                await deleteDoc(doc(db, 'students', studentId));

            } catch (error) {
                console.error('Error permanently deleting student: ', error);
                alert('Failed to delete student and their data.');
            }
        }
    }

    if (action === 'update-topic-status') {
        const {studentId, topicId, status} = target.dataset;
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        const student = studentSnap.data();

        const updatedSyllabus = student.syllabus.map(topic =>
            topic.id === topicId ? {...topic, status: status} : topic,
        );

        await updateDoc(studentRef, {syllabus: updatedSyllabus});
    }

    // deleting a syllabus topic
    if (action === 'delete-topic') {
        if (confirm('Are you sure you want to delete this topic?')) {
            const {studentId, topicId} = target.dataset;
            const studentRef = doc(db, 'students', studentId);
            try {
                const studentSnap = await getDoc(studentRef);
                const student = studentSnap.data();

                // Filter out the topic to be deleted
                const updatedSyllabus = student.syllabus.filter(topic => topic.id !== topicId);

                await updateDoc(studentRef, {syllabus: updatedSyllabus});
            } catch (error) {
                console.error('Error deleting topic: ', error);
                alert('Failed to delete topic.');
            }
        }
    }

    // deleting a session log
    if (action === 'delete-session') {
        if (confirm('Are you sure you want to delete this session log?')) {
            const {sessionId} = target.dataset;
            const sessionRef = doc(db, 'sessions', sessionId);
            try {
                await deleteDoc(sessionRef);
            } catch (error) {
                console.error('Error deleting session: ', error);
                alert('Failed to delete session log.');
            }
        }
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
        const dateInputs = e.target.querySelectorAll('input[name="dates"]');
        const dates = Array.from(dateInputs)
            .map(input => input.value)
            .filter(d => d)
            .map(d => new Date(d).toISOString());

        const studentData = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            contact: formData.get('contact'),
            dates: dates,
            tutorId: currentUser.uid,
            status: STATUS.ACTIVE,
            syllabus: [],
        };
        await addDoc(collection(db, 'students'), studentData);
        closeModal();
    }

    // Edit Student
    if (e.target.id === 'edit-student-form') {
        const studentId = e.target.dataset.id;
        if (!studentId) return;

        const studentRef = doc(db, 'students', studentId);
        const formData = new FormData(e.target);

        const dateInputs = e.target.querySelectorAll('input[name="dates"]');
        const dates = Array.from(dateInputs)
            .map(input => input.value)
            .filter(d => d)
            .map(d => new Date(d).toISOString());

        const updatedData = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            contact: formData.get('contact'),
            dates: dates,
        };

        try {
            await updateDoc(studentRef, updatedData);
            closeModal();
            // No need to call renderStudentDetailPage, onSnapshot handles it.
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Failed to update student. Please try again.');
        }
    }

    // Add Syllabus Topic
    if (e.target.id === 'add-topic-form') {
        const studentId = window.location.pathname.split('/')[3];
        const title = e.target.querySelector('#new-topic-title').value;
        if (title) {
            const studentRef = doc(db, 'students', studentId);
            await updateDoc(studentRef, {
                syllabus: arrayUnion({
                    id: crypto.randomUUID(), // Simple UUID for topics
                    title: title,
                    status: TOPIC_STATUS.NOT_STARTED,
                }),
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
            topicsCoveredIds: formData.getAll('topics'),
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