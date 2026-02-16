/**
 * Team.js
 * Logic for Team Management
 */

// State
let members = [];
const TEAM_STORAGE_KEY = 'shardeen_team';
let profileModalBS = null;
let addMemberModalBS = null;

// DOM Elements
const teamGrid = document.getElementById('teamGrid');
const addMemberForm = document.getElementById('addMemberForm');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the team page
    if (document.getElementById('teamGrid')) {
        // Init Modals
        const profileModalEl = document.getElementById('profileModal');
        if (profileModalEl) profileModalBS = new bootstrap.Modal(profileModalEl);

        const addMemberModalEl = document.getElementById('addMemberModal');
        if (addMemberModalEl) addMemberModalBS = new bootstrap.Modal(addMemberModalEl);

        loadMembers();
        renderMembers();
        setupTeamEventListeners();
    }
});

/**
 * Load members from storage or set initial data
 */
function loadMembers() {
    const storedMembers = localStorage.getItem(TEAM_STORAGE_KEY);
    if (storedMembers) {
        members = JSON.parse(storedMembers);
    } else {
        // Initial Data as requested
        members = [
            {
                id: '1',
                name: 'Sudarshan',
                role: 'Backend Expert',
                image: 'assets/images/sudarshan.jpeg',
                experience: '3 Years',
                projects: 'API Migration, Database Optimization, Auth System',
                projectCount: 5,
                taskCount: 12
            },
            {
                id: '2',
                name: 'Heramb',
                role: 'Team Member',
                image: null, // No image
                experience: '1 Month (Intern)',
                projects: 'Internal Dashboard, UI Components',
                projectCount: 3,
                taskCount: 8
            }
        ];
        saveMembers();
    }
}

/**
 * Save to LocalStorage
 */
function saveMembers() {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
}

/**
 * Render Team Grid
 */
function renderMembers() {
    teamGrid.innerHTML = '';

    members.forEach(member => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-3';

        let avatarHtml = '';
        if (member.image) {
            avatarHtml = `
                <div class="rounded-circle overflow-hidden mb-3 mx-auto" style="width: 80px; height: 80px;">
                    <img src="${member.image}" alt="${member.name}" class="w-100 h-100 object-fit-cover">
                </div>
            `;
        } else {
            const initial = member.name.charAt(0).toUpperCase();
            avatarHtml = `
                <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mb-3 mx-auto fs-3 fw-bold" style="width: 80px; height: 80px;">
                    <span>${initial}</span>
                </div>
            `;
        }

        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm text-center p-3 hover-lift" style="transition: transform 0.2s;">
                <div class="card-body d-flex flex-column align-items-center">
                    ${avatarHtml}
                    <h5 class="fw-bold mb-1 text-dark">${member.name}</h5>
                    <p class="text-secondary small mb-3">${member.role}</p>
                    
                    <div class="d-flex gap-2 justify-content-center mb-4">
                        <span class="badge bg-light text-dark border fw-normal">${member.projectCount} Projects</span>
                        <span class="badge bg-light text-dark border fw-normal">${member.taskCount} Tasks</span>
                    </div>
                    
                    <div class="mt-auto w-100">
                        <button class="btn btn-outline-primary w-100 btn-sm" onclick="openProfile('${member.id}')">View Profile</button>
                    </div>
                </div>
            </div>
        `;
        teamGrid.appendChild(col);
    });

    // Add "Add Member" Button
    const addCol = document.createElement('div');
    addCol.className = 'col-md-6 col-lg-3';
    addCol.innerHTML = `
        <div class="card h-100 border border-2 border-dashed bg-transparent d-flex align-items-center justify-content-center p-4 cursor-pointer" onclick="openAddMemberModal()" style="min-height: 280px; cursor: pointer; border-style: dashed !important; border-color: var(--border-color) !important;">
            <div class="text-center text-secondary">
                <span class="material-icons-round fs-1 mb-2">add</span>
                <p class="fw-medium mb-0">Add Member</p>
            </div>
        </div>
    `;
    teamGrid.appendChild(addCol);
}

/**
 * Open Profile Modal
 */
window.openProfile = function (id) {
    const member = members.find(m => m.id === id);
    if (!member) return;

    // Populate Data
    document.getElementById('profileName').textContent = member.name;
    document.getElementById('profileRole').textContent = member.role;
    document.getElementById('profileExp').textContent = member.experience;
    document.getElementById('profileProjects').textContent = member.projects || 'No assigned projects';
    document.getElementById('profileProjectCount').textContent = member.projectCount;
    document.getElementById('profileTaskCount').textContent = member.taskCount;

    // Avatar
    const avatarContainer = document.getElementById('profileAvatar');
    avatarContainer.innerHTML = '';

    // Reset classes
    // container is already styled in HTML

    if (member.image) {
        avatarContainer.innerHTML = `<img src="${member.image}" alt="${member.name}" class="w-100 h-100 object-fit-cover">`;
        avatarContainer.classList.remove('bg-primary', 'text-white'); // Remove placeholders
    } else {
        avatarContainer.innerHTML = `<span>${member.name.charAt(0).toUpperCase()}</span>`;
        avatarContainer.classList.add('bg-primary', 'text-white'); // Add placeholders
    }

    if (profileModalBS) profileModalBS.show();
};

/**
 * Open Add Member Modal
 */
window.openAddMemberModal = function () {
    if (addMemberForm) addMemberForm.reset();
    if (addMemberModalBS) addMemberModalBS.show();
}

/**
 * Handle Add Member Submit
 */
function handleAddMember(e) {
    e.preventDefault();

    const name = document.getElementById('newMemberName').value;
    const role = document.getElementById('newMemberRole').value;
    const exp = document.getElementById('newMemberExp').value;
    const projects = document.getElementById('newMemberProjects').value;

    const newMember = {
        id: Date.now().toString(),
        name: name,
        role: role,
        image: null,
        experience: exp,
        projects: projects || 'Onboarding',
        projectCount: 0,
        taskCount: 0
    };

    members.push(newMember);
    saveMembers();
    renderMembers();
    if (addMemberModalBS) addMemberModalBS.hide();
}


/**
 * Event Listeners
 */
function setupTeamEventListeners() {
    // Close on outside click handled by Bootstrap
    // Close buttons handled by data-bs-dismiss

    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMember);
}
