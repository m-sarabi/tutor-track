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
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    // Find the header on the page
    const header = document.getElementById('app-header');
    if (!header) return;

    let scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop && scrollTop > 10) {
        // Scrolling Down: Hide the header
        header.classList.add('-translate-y-[150%]');
    } else {
        // Scrolling Up: Show the header
        header.classList.remove('-translate-y-[150%]');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, false);

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
    // Combine the base path and the app path
    const fullPath = (BASE_PATH + path).replace('//', '/');
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
    closeModal();
};

window.onpopstate = handleRouteChange;


// --- UI RENDERING --- //

// Reusable Tailwind classes
const panelClasses = 'bg-white/40 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg';
const inputClasses = 'w-full px-4 py-2 mt-2 bg-white/60 border border-gray-300 rounded-md text-zinc-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500';
const primaryButtonClasses = 'w-full px-6 py-2.5 mt-4 font-semibold text-white bg-sky-600 rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500';
const backLinkClasses = 'text-sky-700 hover:underline font-medium flex justify-between items-center';

// Render Login Page
const renderLoginPage = () => {
    appContainer.innerHTML = `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="px-8 py-10 text-left ${panelClasses} w-full max-w-md">
                <h3 class="text-2xl font-bold text-center text-gray-800">TutorTrack Login</h3>
                <form id="login-form">
                    <div class="mt-4">
                        <div>
                            <label class="block text-gray-700 font-medium" for="email">Email</label>
                            <input type="email" placeholder="you@example.com" id="login-email" required class="${inputClasses}">
                        </div>
                        <div class="mt-4">
                            <label class="block text-gray-700 font-medium">Password</label>
                            <input type="password" placeholder="Password" id="login-password" required class="${inputClasses}">
                        </div>
                        <div class="flex items-baseline justify-between">
                            <button type="submit" class="${primaryButtonClasses}">Login</button>
                        </div>
                        <div class="text-center mt-4">
                            <a href="/signup" data-link class="text-sm text-sky-700 hover:underline">Don't have an account? Sign up</a>
                        </div>
                    </div>
                </form>
                 <div class="relative my-6">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-white/30 text-gray-600 rounded-full backdrop-blur-sm">Or continue with</span>
                    </div>
                </div>
                <button id="google-signin-btn" class="w-full flex items-center justify-center px-6 py-2.5 mt-2 font-semibold text-gray-700 bg-white/80 border border-gray-300 rounded-lg shadow-sm hover:bg-white">
                    <img src="${BASE_PATH}/assets/google.svg" alt="Google icon" class="w-5 h-5 mr-3">
                    Sign in with Google
                </button>
            </div>
        </div>
    `;
};

// Render Sign Up Page
const renderSignupPage = () => {
    appContainer.innerHTML = `
       <div class="flex items-center justify-center min-h-screen p-4">
            <div class="px-8 py-10 text-left ${panelClasses} w-full max-w-md">
                <h3 class="text-2xl font-bold text-center text-gray-800">Create an Account</h3>
                <form id="signup-form">
                    <div class="mt-4">
                        <div>
                            <label class="block text-gray-700 font-medium" for="email">Email</label>
                            <input type="email" placeholder="you@example.com" id="signup-email" required class="${inputClasses}">
                        </div>
                        <div class="mt-4">
                            <label class="block text-gray-700 font-medium">Password</label>
                            <input type="password" placeholder="Password (6+ characters)" id="signup-password" required class="${inputClasses}">
                        </div>
                        <div class="flex">
                            <button type="submit" class="${primaryButtonClasses}">Sign Up</button>
                        </div>
                        <div class="text-center mt-4">
                           <a href="/login" data-link class="text-sm text-sky-700 hover:underline">Already have an account? Log in</a>
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
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <header id="app-header" class="sticky top-4 z-10 ${panelClasses} transition-transform duration-300">
                <div class="px-6 py-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-800">TutorTrack</h1>
                    <div class="flex items-center gap-4">
                        <span class="text-gray-700 hidden sm:inline">Welcome, ${currentUser.displayName || currentUser.email}</span>
                        <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 font-semibold">Logout</button>
                    </div>
                </div>
            </header>
            <main class="py-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-semibold text-gray-800">My Students</h2>
                    <div>
                        <a href="/archived" data-link class="text-sky-700 hover:underline font-medium mr-4">View Archived</a>
                        <button id="add-student-btn" class="px-6 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 font-semibold">+ Add Student</button>
                    </div>
                </div>
                <div id="students-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Student cards will be inserted here -->
                    <p class="text-gray-600">Loading students...</p>
                </div>
            </main>
        </div>
    `;

    // Fetch and display students
    const q = query(collection(db, 'students'), where('tutorId', '==', currentUser.uid), where('status', '==', STATUS.ACTIVE));
    onSnapshot(q, (querySnapshot) => {
        const studentsList = document.getElementById('students-list');
        if (!studentsList) return; // Exit if the page has changed

        if (querySnapshot.empty) {
            studentsList.innerHTML = `<div class="${panelClasses} p-6 col-span-full"><p class="text-gray-700">You haven't added any students yet. Click "Add Student" to get started!</p></div>`;
            return;
        }

        const students = [];
        querySnapshot.forEach((doc) => {
            students.push({id: doc.id, ...doc.data()});
        });

        const getNextSession = (student) => {
            const upcoming = (student.dates || [])
                .map(d => new Date(d))
                .filter(d => d > new Date())
                .sort((a, b) => a - b);
            return upcoming.length > 0 ? upcoming[0] : null;
        };

        students.sort((a, b) => {
            const nextSessionA = getNextSession(a);
            const nextSessionB = getNextSession(b);

            if (nextSessionA && !nextSessionB) return -1; // A has a session, B does not -> A comes first
            if (!nextSessionA && nextSessionB) return 1;  // B has a session, A does not -> B comes first
            if (!nextSessionA && !nextSessionB) return 0; // Neither has a session -> order doesn't matter

            // Both have sessions -> sort by date
            return nextSessionA.getTime() - nextSessionB.getTime();
        });

        studentsList.innerHTML = '';
        students.forEach((student) => {
            const upcomingDates = (student.dates || [])
                .map(d => new Date(d))
                .filter(d => d > new Date())
                .sort((a, b) => a - b)
                .map(d => formatDateTime(d));

            const studentCard = document.createElement('div');
            studentCard.className = `${panelClasses} p-6 transition-transform transform hover:-translate-y-1 hover:shadow-xl cursor-pointer`;
            studentCard.dataset.id = student.id;
            studentCard.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800">${student.name}</h3>
                <p class="text-gray-600">${student.subject}</p>
                <div class="mt-4">
                    <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming Sessions</h4>
                    ${upcomingDates.length > 0
                ? `<p class="text-gray-700 mt-1">${upcomingDates.slice(0, 3).join('<br>')}</p>`
                : `<p class="text-gray-500 text-sm mt-1">No upcoming sessions scheduled.</p>`
            }
                </div>
            `;
            studentCard.addEventListener('click', () => navigateTo(`/student/${student.id}`));
            studentsList.appendChild(studentCard);
        });
    });
};

// Render Archived Page
const renderArchivedDashboardPage = () => {
    appContainer.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <header id="app-header" class="sticky top-4 z-10 ${panelClasses} transition-transform duration-300">
                <div class="px-6 py-4 flex justify-between items-center">
                    <a href="/" data-link class="${backLinkClasses}">
                        <svg width="24" height="24">
                            <use href="${BASE_PATH}/assets/chevrons-left.svg"></use>
                        </svg>
                        Back to Dashboard
                    </a>
                    <div class="flex items-center gap-4">
                        <span class="text-gray-700 hidden sm:inline">Welcome, ${currentUser.displayName || currentUser.email}</span>
                        <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 font-semibold">Logout</button>
                    </div>
                </div>
            </header>
            <main class="py-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-semibold text-gray-800">Archived Students</h2>
                </div>
                <div id="archived-students-list" class="space-y-4">
                    <p class="text-gray-600">Loading archived students...</p>
                </div>
            </main>
        </div>
    `;

    const q = query(collection(db, 'students'), where('tutorId', '==', currentUser.uid), where('status', '==', STATUS.ARCHIVED));
    onSnapshot(q, (querySnapshot) => {
        const studentsList = document.getElementById('archived-students-list');
        if (studentsList) {
            if (querySnapshot.empty) {
                studentsList.innerHTML = `<div class="${panelClasses} p-6"><p class="text-gray-700">You have no archived students.</p></div>`;
                return;
            }
            studentsList.innerHTML = ''; // Clear list
            querySnapshot.forEach((doc) => {
                const student = {id: doc.id, ...doc.data()};
                const studentCard = document.createElement('div');
                studentCard.className = `${panelClasses} p-4 flex justify-between items-center`;
                studentCard.dataset.id = student.id;
                studentCard.innerHTML = `
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${student.name}</h3>
                        <p class="text-gray-600">${student.subject}</p>
                    </div>
                    <div class="space-x-2">
                        <button data-action="restore-student" data-id="${student.id}" class="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 font-semibold">Restore</button>
                        <button data-action="delete-student" data-id="${student.id}" class="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 font-semibold">Delete Permanently</button>
                    </div>
                `;
                studentsList.appendChild(studentCard);
            });
        }
    });
};

// Showdown converter instance
const markdownConverter = new showdown.Converter();

// Render Student Detail Page
const renderStudentDetailPage = async (studentId) => {
    appContainer.innerHTML = `<p class="text-center mt-10 text-gray-700">Loading student details...</p>`;

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
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <header id="app-header" class="sticky top-4 z-10 ${panelClasses} transition-transform duration-300">
                <div class="px-6 py-4 flex justify-between items-center">
                    <a href="/" data-link class="${backLinkClasses}">
                       <svg width="24" height="24">
                           <use href="${BASE_PATH}/assets/chevrons-left.svg"></use>
                       </svg>
                       Back to Dashboard
                    </a>
                    <div class="flex items-center gap-4">
                        <span class="text-gray-700 hidden sm:inline">Welcome, ${currentUser.displayName || currentUser.email}</span>
                        <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 font-semibold">Logout</button>
                    </div>
                </div>
            </header>
            <main class="py-8">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">${student.name}</h2>
                        <p class="text-xl text-gray-600">${student.subject}</p>
                    </div>
                    <div>
                        <button data-action="edit-student" data-id="${student.id}" class="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 font-semibold mr-2">Edit</button>
                        <button data-action="archive-student" data-id="${student.id}" class="px-4 py-2 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600 font-semibold">Archive</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Column 1: Syllabus & Sessions -->
                    <div class="lg:col-span-1 space-y-8">
                        <div class="${panelClasses} p-6 max-h-[45vh] flex flex-col">
                            <h3 class="text-xl font-semibold mb-4 text-gray-800">Syllabus Tracker</h3>
                            <ul id="syllabus-list" class="space-y-2 overflow-y-auto pr-2 flex-1"></ul>
                            <form id="add-topic-form" class="mt-4 flex">
                                <input type="text" id="new-topic-title" placeholder="Add new topic" class="flex-grow px-3 py-2 bg-white/60 border border-gray-300 rounded-l-md text-zinc-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500" required>
                                <button type="submit" class="px-4 py-2 bg-sky-600 text-white rounded-r-md hover:bg-sky-700 font-semibold">Add</button>
                            </form>
                        </div>
                        <div class="${panelClasses} p-6 max-h-[45vh] flex flex-col">
                            <h3 class="text-xl font-semibold mb-4 text-gray-800">Scheduled Sessions</h3>
                            <ul id="scheduled-sessions-list" class="space-y-2 overflow-y-auto pr-2 flex-1"></ul>
                        </div>
                    </div>

                    <!-- Column 2: Notes & Session Log -->
                    <div class="lg:col-span-2 space-y-8">
                        <!-- Student Notes Panel -->
                        <div id="student-notes-container" class="${panelClasses} p-6 max-h-[45vh] flex flex-col">
                            <!-- Note content will be rendered here by onSnapshot -->
                        </div>

                        <!-- Session Log Panel -->
                        <div class="${panelClasses} p-6 max-h-[45vh] flex flex-col">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-xl font-semibold text-gray-800">Session Log</h3>
                                <button id="log-session-btn" class="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 font-semibold">+ Log Session</button>
                            </div>
                            <div id="session-log-list" class="space-y-4 overflow-y-auto pr-2 flex-1"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        `;

        document.getElementById('log-session-btn').addEventListener('click', () => {
            showLogSessionForm(student);
        });

        onSnapshot(studentRef, (docSnap) => {
            const updatedStudent = {id: docSnap.id, ...docSnap.data()};

            // Render Notes
            const notesContainer = document.getElementById('student-notes-container');
            if (notesContainer) {
                renderNotesView(updatedStudent);
            }

            // Render Syllabus
            const syllabusListElement = document.getElementById('syllabus-list');
            if (syllabusListElement) {
                syllabusListElement.innerHTML = renderSyllabus(updatedStudent.syllabus || [], studentId);
            }
            // Render Sessions
            const sessionsListElement = document.getElementById('scheduled-sessions-list');
            if (sessionsListElement) {
                const upcomingDates = (updatedStudent.dates || [])
                    .map(d => new Date(d))
                    .filter(d => d > new Date())
                    .sort((a, b) => a - b);

                if (upcomingDates.length === 0) {
                    sessionsListElement.innerHTML = `<li class="text-gray-500">No upcoming sessions.</li>`;
                } else {
                    sessionsListElement.innerHTML = upcomingDates.map(date =>
                        `<li class="p-2 rounded bg-black/5 text-gray-700">${formatDateTime(date)}</li>`,
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
                    sessionLogList.innerHTML = `<p class="text-gray-600">No sessions logged yet.</p>`;
                    return;
                }
                sessionLogList.innerHTML = querySnapshot.docs.map(doc => {
                    const session = {id: doc.id, ...doc.data()};
                    const topicsCovered = (session.topicsCoveredIds || [])
                        .map(topicId => (student.syllabus || []).find(t => t.id === topicId)?.title)
                        .filter(Boolean)
                        .join(', ');

                    return `
                    <div class="border-b border-black/10 pb-4">
                        <div class="flex justify-between items-start">
                             <div>
                                <p class="font-bold text-gray-800">${session.date.toDate().toLocaleDateString()} - ${session.duration} mins</p>
                             </div>
                             <button data-action="delete-session" data-session-id="${session.id}" class="text-red-400 hover:text-red-600 font-bold text-2xl leading-none">&times;</button>
                        </div>
                        <p class="text-sm mt-2 text-gray-700"><strong class="font-semibold text-gray-800">Notes:</strong> ${session.notes || 'N/A'}</p>
                        <p class="text-sm mt-1 text-gray-700"><strong class="font-semibold text-gray-800">Next Steps:</strong> ${session.nextSteps || 'N/A'}</p>
                        <p class="text-sm mt-1 text-gray-700"><strong class="font-semibold text-gray-800">Topics:</strong> ${topicsCovered || 'None'}</p>
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

// notes view (display mode)
const renderNotesView = (student) => {
    const notesContainer = document.getElementById('student-notes-container');
    if (!notesContainer) return;

    const notesMarkdown = student.notes || '';
    const notesHtml = notesMarkdown
        ? markdownConverter.makeHtml(notesMarkdown)
        : '<p class="text-gray-500">No notes yet. Click Edit to add some.</p>';

    notesContainer.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-800">Student Notes</h3>
            <button data-action="edit-notes" data-student-id="${student.id}" class="px-3 py-1 bg-sky-500 text-white text-sm rounded-md shadow-sm hover:bg-sky-600 font-semibold">Edit</button>
        </div>
        <div class="overflow-y-auto pr-2 flex-1">
            <div class="prose max-w-none text-gray-800  prose-li:marker:text-gray-700">
                ${notesHtml}
            </div>
        </div>
    `;
};


// notes editor view (edit mode)
const renderNotesEditView = (student) => {
    const notesContainer = document.getElementById('student-notes-container');
    if (!notesContainer) return;

    const currentNotes = student.notes || '';

    notesContainer.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-800">Editing Notes</h3>
        </div>
        <textarea id="notes-editor" class="${inputClasses} !mt-0" rows="10 flex-1" >${currentNotes}</textarea>
        <div class="flex justify-end gap-2 mt-4">
             <button data-action="cancel-edit-notes" data-student-id="${student.id}" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
             <button data-action="save-notes" data-student-id="${student.id}" class="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 font-semibold">Save Notes</button>
        </div>
    `;
};

const renderSyllabus = (syllabus, studentId) => {
    if (!syllabus || syllabus.length === 0) {
        return `<li class="text-gray-500">No topics added to the syllabus yet.</li>`;
    }
    return syllabus.map(topic => `
        <li class="flex justify-between items-center p-2 rounded hover:bg-black/10 text-gray-700">
            <span class="flex-grow mr-4">${topic.title}</span>
            <div class="flex items-center space-x-1 flex-shrink-0">
                <button title="Not Started" data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="Not Started" class="status-btn p-1.5 rounded-full bg-gray-300 ${topic.status === TOPIC_STATUS.NOT_STARTED ? 'ring-2 ring-offset-1 ring-gray-500' : 'opacity-50'}"><img src="${BASE_PATH}/assets/circle.svg" class="w-4 h-4" alt=""></button>
                <button title="In Progress" data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="In Progress" class="status-btn p-1.5 rounded-full bg-yellow-400 ${topic.status === TOPIC_STATUS.IN_PROGRESS ? 'ring-2 ring-offset-1 ring-yellow-600' : 'opacity-50'}"><img src="${BASE_PATH}/assets/loader.svg" class="w-4 h-4" alt=""></button>
                <button title="Completed" data-action="update-topic-status" data-student-id="${studentId}" data-topic-id="${topic.id}"
                    data-status="Completed" class="status-btn p-1.5 rounded-full bg-green-500 ${topic.status === TOPIC_STATUS.COMPLETED ? 'ring-2 ring-offset-1 ring-green-700' : 'opacity-50'}"><img src="${BASE_PATH}/assets/check-circle.svg" class="w-4 h-4" alt=""></button>
                <button title="Delete Topic" data-action="delete-topic" data-student-id="${studentId}" data-topic-id="${topic.id}" class="ml-2 text-red-400 hover:text-red-600 font-bold text-xl">&times;</button>
            </div>
        </li>
    `).join('');
};

// --- MODALS --- //

const showModal = (title, content) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center p-4 z-50';
    modal.innerHTML = `
        <div class="modal-content ${panelClasses} p-8 w-full max-w-lg">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">${title}</h2>
                <button data-action="close-modal" class="text-red-500 hover:text-red-700 text-4xl font-bold leading-none">&times;</button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
};

const closeModal = () => {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
};

const showAddStudentModal = () => {
    const content = `
        <form id="add-student-form">
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Student Name</label>
                <input type="text" name="name" class="${inputClasses}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Subject</label>
                <input type="text" name="subject" class="${inputClasses}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Contact Info (Optional)</label>
                <input type="text" name="contact" class="${inputClasses}">
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Scheduled Dates (Optional)</label>
                <div id="dates-container" class="space-y-2"></div>
                <button type="button" data-action="add-date-input" class="mt-2 text-sm text-sky-700 hover:underline">+ Add another date</button>
            </div>
            <button type="submit" class="w-full bg-sky-600 text-white p-2 rounded-lg shadow hover:bg-sky-700 font-semibold">Add Student</button>
        </form>
    `;
    showModal('Add New Student', content);
};

const showLogSessionForm = (student) => {
    const studentId = student.id;
    const syllabusOptions = (student.syllabus || []).map(topic =>
        `<label class="flex items-center text-gray-700 p-1.5 rounded hover:bg-black/10"><input type="checkbox" name="topics" value="${topic.id}" class="mr-2 h-4 w-4 rounded border-gray-400 text-sky-600 focus:ring-sky-500">${topic.title}</label>`,
    ).join('');

    const content = `
        <form id="log-session-form" data-student-id="${studentId}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-gray-700 font-medium">Date</label>
                    <input type="date" name="date" class="${inputClasses}" required>
                </div>
                <div>
                    <label class="block text-gray-700 font-medium">Duration (minutes)</label>
                    <input type="number" name="duration" class="${inputClasses}" required>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Session Notes</label>
                <textarea name="notes" class="${inputClasses}" rows="3"></textarea>
            </div>
             <div class="mb-4">
                <label class="block text-gray-700 font-medium">Topics Covered</label>
                <div class="max-h-32 overflow-y-auto border border-gray-300 bg-white/50 p-2 rounded-md mt-2">
                    ${syllabusOptions || '<p class="text-sm text-gray-500">No syllabus topics available.</p>'}
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Next Steps / Homework</label>
                <textarea name="nextSteps" class="${inputClasses}" rows="2"></textarea>
            </div>
            <button type="submit" class="w-full bg-green-500 text-white p-2 rounded-lg shadow hover:bg-green-600 font-semibold">Log Session</button>
        </form>
    `;
    showModal('Log New Session', content);
};

const showEditStudentModal = (student) => {
    const existingDatesHTML = (student.dates || [])
        .map(date => `
            <div class="flex items-center space-x-2 date-input-row">
                <input type="datetime-local" name="dates" class="${inputClasses} !mt-0" value="${formatDateTimeForInput(new Date(date))}">
                <button type="button" data-action="remove-date-input" class="px-2 py-1 text-red-500 hover:text-red-700 font-bold text-2xl">&times;</button>
            </div>
        `).join('');

    const content = `
        <form id="edit-student-form" data-id="${student.id}">
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Student Name</label>
                <input type="text" name="name" class="${inputClasses}" value="${student.name}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Subject</label>
                <input type="text" name="subject" class="${inputClasses}" value="${student.subject}" required>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium">Contact Info (Optional)</label>
                <input type="text" name="contact" class="${inputClasses}" value="${student.contact || ''}">
            </div>
             <div class="mb-4">
                <label class="block text-gray-700 font-medium">Scheduled Dates (Optional)</label>
                <div id="dates-container" class="space-y-2 mt-2">
                    ${existingDatesHTML}
                </div>
                <button type="button" data-action="add-date-input" class="mt-2 text-sm text-sky-700 hover:underline">+ Add another date</button>
            </div>
            <button type="submit" class="w-full bg-yellow-500 text-white p-2 rounded-lg shadow hover:bg-yellow-600 font-semibold">Save Changes</button>
        </form>
    `;
    showModal('Edit Student Details', content);
};


// --- EVENT LISTENERS (using event delegation) --- //

document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target && !e.target.matches('[data-link]') && !e.target.id) return;

    const action = target?.dataset.action;

    if (e.target.closest('[data-link]')) {
        e.preventDefault();
        navigateTo(e.target.closest('[data-link]').getAttribute('href'));
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
                <input type="datetime-local" name="dates" class="${inputClasses} !mt-0">
                <button type="button" data-action="remove-date-input" class="px-2 py-1 text-red-500 hover:text-red-700 font-bold text-2xl">&times;</button>
            `;
            container.appendChild(dateRow);
        }
    }

    if (action === 'remove-date-input') {
        target.closest('.date-input-row').remove();
    }

    if (action === 'edit-notes') {
        const {studentId} = target.dataset;
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
            renderNotesEditView({id: studentSnap.id, ...studentSnap.data()});
        }
    }

    if (action === 'save-notes') {
        const {studentId} = target.dataset;
        const newNotes = document.getElementById('notes-editor').value;
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, {notes: newNotes});
        // onSnapshot will automatically re-render the view mode
    }

    if (action === 'cancel-edit-notes') {
        const {studentId} = target.dataset;
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
            renderNotesView({id: studentSnap.id, ...studentSnap.data()});
        }
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
            notes: '',
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
        const studentId = window.location.pathname.split('/').pop();
        const title = e.target.querySelector('#new-topic-title').value;
        if (title) {
            const studentRef = doc(db, 'students', studentId);
            await updateDoc(studentRef, {
                syllabus: arrayUnion({
                    id: crypto.randomUUID(),
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