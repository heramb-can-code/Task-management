/**
 * Projects.js
 * Logic for managing projects (Depends on api-config.js and manager-dropdown.js)
 */

let projects = [];
let editingProjectId = null;
let projectModalBS = null;

// DOM Elements
const projectListContainer = document.getElementById('projectListContainer');
const projectForm = document.getElementById('projectForm');
const addProjectBtn = document.getElementById('addProjectBtn');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const sortBy = document.getElementById('sortBy');
const emptyStateInfo = document.getElementById('emptyState');

/**
 * Initialize
 */
function init() {
    // Initialize Bootstrap Modal
    const modalEl = document.getElementById('projectModal');
    if (modalEl) {
        projectModalBS = new bootstrap.Modal(modalEl);
    }

    loadProjects();
    initManagerDropdown();
    renderProjects();
    setupEventListeners();
}

/**
 * Load projects from API
 */
async function loadProjects() {
    try {
        const response = await fetch(`${PROJECT_GET_BY_QUERY_API}?skip=0&take=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                projects = data;
            } else if (data.data && Array.isArray(data.data)) {
                projects = data.data;
            } else if (data.data && data.data.records && Array.isArray(data.data.records)) {
                projects = data.data.records;
            } else if (data.result && Array.isArray(data.result)) {
                projects = data.result;
            } else {
                projects = [];
                console.warn("Unexpected API response format", data);
            }
            renderProjects();
        } else {
            console.error('Failed to load projects:', response.statusText);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

/**
 * Render Projects
 */
function renderProjects() {
    projectListContainer.innerHTML = '';

    // Add empty state holder again if cleared
    if (emptyStateInfo) projectListContainer.appendChild(emptyStateInfo);

    const searchText = searchInput.value.toLowerCase();
    const sortValue = sortBy ? sortBy.value : 'recent';

    // Filter Logic
    let filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchText) ||
            (project.description && project.description.toLowerCase().includes(searchText));

        // Status filter currently removed from UI, but if added back:
        // const statusFilter = filterStatus ? filterStatus.value : 'all';
        // const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

        return matchesSearch;
    });

    // Sorting Logic
    if (sortValue !== 'recent') {
        filteredProjects.sort((a, b) => {
            if (sortValue === 'date') {
                return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
            } else if (sortValue === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            }
            return 0;
        });
    }

    if (filteredProjects.length === 0) {
        if (emptyStateInfo) emptyStateInfo.classList.remove('d-none');
        return;
    }

    if (emptyStateInfo) emptyStateInfo.classList.add('d-none');

    filteredProjects.forEach(project => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        let statusClass = 'bg-secondary';
        if (project.status === 'active') statusClass = 'bg-success-subtle text-success';
        if (project.status === 'completed') statusClass = 'bg-primary-subtle text-primary';
        if (project.status === 'paused') statusClass = 'bg-warning-subtle text-warning';

        let priorityClass = 'bg-secondary';
        const pVal = (project.priority || 'medium').toLowerCase();
        if (pVal === 'high') priorityClass = 'bg-danger-subtle text-danger';
        if (pVal === 'medium') priorityClass = 'bg-info-subtle text-info';
        if (pVal === 'low') priorityClass = 'bg-light text-secondary border';

        // Safe date formatting
        let formattedDate = '-';
        if (project.dueDate) {
            const date = new Date(project.dueDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
                });
            }
        }

        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm project-card" style="transition: transform 0.2s;">
                <div class="card-body d-flex flex-column" onclick="window.location.href='project-details.html?id=${project.id}'" style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold text-dark mb-0">${project.name}</h5>
                         <div class="d-flex align-items-center gap-1">
                             <!-- Status and Priority removed by request -->
                        </div>
                    </div>
                    <p class="card-text text-secondary small flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${project.description || 'No description'}</p>
                    <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center text-muted small">
                        <span>Due: ${formattedDate}</span>
                         <div class="d-flex gap-2">
                             <button class="btn btn-sm btn-light text-secondary rounded-circle p-1" onclick="event.stopPropagation(); editProject('${project.id}')" title="Edit Project">
                                <span class="material-icons-round fs-6">edit</span>
                            </button>
                            <span class="material-icons-round text-primary" style="font-size: 1.2rem;">arrow_forward</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        projectListContainer.appendChild(col);
    });
}

/**
 * Modal & Form Handling
 */
function openAddProjectModal() {
    if (editingProjectId) return;

    document.getElementById('modalTitle').textContent = 'Add New Project';
    projectForm.reset();
    resetManagerDropdown();

    // Set default dates
    const dateInput = document.getElementById('projectDate');
    const startDateInput = document.getElementById('projectStartDate');
    const today = new Date().toISOString().split('T')[0];

    if (dateInput) dateInput.value = today;
    if (startDateInput) startDateInput.value = today;

    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) deleteBtn.classList.add('d-none');
}

/**
 * Edit Project - Includes Manager Name Fetch Fallback
 */
window.editProject = async function (id) {
    resetManagerDropdown();

    let project = projects.find(p => p.id === id);
    try {
        const freshData = await getProjectById(id);
        if (freshData) {
            project = freshData;
        }
    } catch (e) {
        console.warn("Could not load fresh data, using local:", e);
    }

    if (!project) {
        alert("Project not found!");
        return;
    }

    editingProjectId = id;
    document.getElementById('modalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDescription').value = project.description || '';

    const formatDateInput = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().split('T')[0];
    };

    document.getElementById('projectDate').value = formatDateInput(project.dueDate);
    document.getElementById('projectStartDate').value = formatDateInput(project.startDate);
    document.getElementById('projectClientId').value = project.clientId || '';

    // Status and Priority removed from UI
    // if (document.getElementById('projectStatus')) document.getElementById('projectStatus').value = project.status || 'active';
    // if (document.getElementById('projectPriority')) document.getElementById('projectPriority').value = project.priority || 'medium';

    // Set Manager UI
    const managerId = project.managerEmployeeId || project.ManagerEmployeeId; // PascalCase check

    if (managerId) {
        const mgr = managerState.managers.find(m => m.id == managerId);

        if (mgr) {
            selectManager(mgr.id, `${mgr.firstName} ${mgr.lastName || ''}`);
        } else {
            // Fetch specific manager details fallback
            try {
                const searchUrl = `${PROJECT_EMPLOYEE_API}?search=${managerId}&skip=0&take=1`;

                selectManager(managerId, 'Loading Manager...');

                fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }).then(res => res.json())
                    .then(data => {
                        let record = null;
                        if (Array.isArray(data) && data.length > 0) record = data[0];
                        else if (data.data?.records?.length > 0) record = data.data.records[0];
                        else if (data.result?.length > 0) record = data.result[0];

                        if (record && record.id == managerId) {
                            const fullName = `${record.firstName || record.FirstName || ''} ${record.lastName || record.LastName || ''}`;
                            selectManager(managerId, fullName);
                        } else {
                            // Try fallback to saved name
                            const managerName = project.managerName || project.ManagerName;
                            if (managerName) {
                                selectManager(managerId, managerName);
                            } else {
                                selectManager(managerId, 'Unknown Manager (ID: ' + managerId + ')');
                            }
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching manager detail:", err);
                        // Try fallback to saved name
                        const managerName = project.managerName || project.ManagerName;
                        if (managerName) {
                            selectManager(managerId, managerName);
                        } else {
                            selectManager(managerId, 'Unknown Manager (ID: ' + managerId + ')');
                        }
                    });

            } catch (e) {
                selectManager(managerId, 'Select Manager');
            }
        }
    } else {
        resetManagerDropdown();
    }

    if (projectModalBS) projectModalBS.show();

    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) {
        deleteBtn.classList.remove('d-none');
        deleteBtn.onclick = () => confirmDelete(id);
    }
}

async function getProjectById(id) {
    try {
        const response = await fetch(`${PROJECT_GET_BY_ID_API}?id=${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.data) return data.data;
            if (data.result) return data.result;
            return data;
        }
    } catch (e) {
        console.error("Error fetching project details", e);
    }
    return null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    const dueDateInput = document.getElementById('projectDate').value;
    const startDateInput = document.getElementById('projectStartDate').value;

    const status = 'active'; // Default
    const priority = 'medium'; // Default

    const clientId = document.getElementById('projectClientId').value;
    const managerId = document.getElementById('projectManagerId').value;

    const toISODateTime = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        return new Date(dateStr).toISOString();
    };

    const dueDate = toISODateTime(dueDateInput);
    const startDate = toISODateTime(startDateInput);

    if (editingProjectId) {
        // UPDATE
        const formData = new FormData();
        formData.append('Id', editingProjectId);
        formData.append('Name', name);
        formData.append('Description', description);
        formData.append('ClientId', clientId);
        formData.append('ManagerEmployeeId', managerId);
        formData.append('StartDate', startDate);
        formData.append('DueDate', dueDate);
        formData.append('Status', status);
        formData.append('Priority', priority);

        try {
            const response = await fetch(PROJECT_UPDATE_API, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            if (response.ok) {
                alert('Project updated successfully!');
                if (projectModalBS) projectModalBS.hide();
                loadProjects();
            } else {
                const text = await response.text();
                alert('Failed to update project.');
            }
        } catch (error) {
            alert('Network error when updating project.');
        }
    } else {
        // CREATE
        const formData = new FormData();
        formData.append('Name', name);
        formData.append('Description', description);
        formData.append('ClientId', clientId);
        formData.append('ManagerEmployeeId', managerId);
        formData.append('StartDate', startDate);
        formData.append('DueDate', dueDate);
        formData.append('Status', status);
        formData.append('Priority', priority);

        try {
            const response = await fetch(PROJECT_ADD_API, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken
                },
                body: formData
            });

            if (response.ok) {
                alert('Project successfully added via API!');
            } else {
                const text = await response.text();
                alert('Failed to add project to API.');
            }
        } catch (error) {
            alert('Network error when adding project.');
        }
        loadProjects();
    }

    // saveProjects(); // Deprecated
    // renderProjects(); // loadProjects will render
    if (projectModalBS) projectModalBS.hide();
}

async function confirmDelete(id) {
    if (confirm("Are you sure you want to delete this project?")) {
        try {
            const response = await fetch(`${PROJECT_DELETE_API}?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: id })
            });

            if (response.ok) {
                // Remove from local list to reflect immediately if needed
                projects = projects.filter(p => p.id !== id);
                renderProjects();
                alert("Project deleted successfully.");
            } else {
                const text = await response.text();
                alert("Failed to delete project: " + text);
            }
        } catch (e) {
            alert("Error deleting project");
        }
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function setupEventListeners() {
    if (addProjectBtn) addProjectBtn.addEventListener('click', async () => {
        editingProjectId = null;
        openAddProjectModal();
        if (projectModalBS) projectModalBS.show();
    });

    if (projectForm) projectForm.addEventListener('submit', handleFormSubmit);

    if (searchInput) searchInput.addEventListener('input', renderProjects);
    // if (filterStatus) filterStatus.addEventListener('change', renderProjects);
    if (sortBy) sortBy.addEventListener('change', renderProjects);
}

// Start
init();
