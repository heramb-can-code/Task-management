/**
 * Projects.js
 * Project Management Logic - Fetching, Adding, Editing, Deleting Projects.
 * Handles Manager and Client dropdowns.
 */

// State
let projects = [];
let editingProjectId = null;
let projectModalBS = null;

// DOM Elements
const projectListContainer = document.getElementById('projectListContainer');
const projectForm = document.getElementById('projectForm');
const addProjectBtn = document.getElementById('addProjectBtn');
const searchInput = document.getElementById('searchInput');
const sortBySelect = document.getElementById('sortBy');
const emptyStateInfo = document.getElementById('emptyState');

/**
 * Initialize Projects Page
 */
function init() {
    const modalEl = document.getElementById('projectModal');
    if (modalEl) {
        projectModalBS = new bootstrap.Modal(modalEl);
    }

    // Set default date to today
    const dateInput = document.getElementById('projectStartDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    loadProjects();
    initManagerDropdown();
    initClientDropdown();
    renderProjects();
    setupEventListeners();
}

/**
 * Load Projects from API
 */
async function loadProjects() {
    try {
        const response = await fetch(`${PROJECT_GET_BY_QUERY_API}?page=1&pageSize=100&sortColumn=createdDate&sortOrder=desc`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Handle different response structures
            if (Array.isArray(data)) {
                projects = data;
            } else if (data.data?.records) {
                projects = data.data.records;
            } else if (data.data && Array.isArray(data.data)) {
                projects = data.data;
            } else {
                projects = [];
            }

            if (projects.length > 0) {
                console.log("Existing Project Structure:", projects[0]);
            }

            renderProjects();
        } else {
            console.error("Failed to load projects");
            // Fallback to local storage if API fails? Maybe not mixed mode.
            // projects = JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)) || [];
        }
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

/**
 * Render Projects List
 */
function renderProjects() {
    projectListContainer.innerHTML = '';

    let filteredProjects = [...projects];

    // Search Filter
    const searchText = searchInput.value.toLowerCase();
    if (searchText) {
        filteredProjects = filteredProjects.filter(p =>
            p.name.toLowerCase().includes(searchText) ||
            (p.description && p.description.toLowerCase().includes(searchText))
        );
    }

    // Sorting
    const sortValue = sortBySelect.value;
    filteredProjects.sort((a, b) => {
        if (sortValue === 'date') {
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (sortValue === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            // Recent (assuming stored with timestamp or ID order)
            // If API returns createdDate, use that. Or just ID descent.
            return b.id - a.id;
        }
    });

    if (filteredProjects.length === 0) {
        if (emptyStateInfo) emptyStateInfo.classList.remove('d-none');
        return;
    }

    if (emptyStateInfo) emptyStateInfo.classList.add('d-none');

    filteredProjects.forEach(project => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        // Status Badge Logic
        const status = project.status ? project.status.toLowerCase() : 'active';
        let statusClass = 'bg-secondary text-white';
        if (status === 'active') statusClass = 'bg-success-subtle text-success';
        if (status === 'completed') statusClass = 'bg-primary-subtle text-primary';
        if (status === 'paused') statusClass = 'bg-warning-subtle text-warning';

        // Calculate progress/days left (mock logic for now or real if data available)
        const daysLeft = getDaysDifference(new Date(), new Date(project.dueDate));
        let daysText = daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`;
        let daysClass = daysLeft < 0 ? 'text-danger' : 'text-muted';

        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm project-card" onclick="location.href='project-details.html?id=${project.id}'" style="cursor: pointer;">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                            <span class="material-icons-round text-primary">folder</span>
                        </div>
                        <div class="dropdown" onclick="event.stopPropagation()">
                             <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <span class="material-icons-round">more_vert</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                                <li><a class="dropdown-item" href="#" onclick="editProject(${project.id}); return false;">Edit</a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="confirmDelete(${project.id}); return false;">Delete</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <h5 class="fw-bold mb-1 text-truncate">${project.name}</h5>
                    <p class="text-muted small mb-3 text-truncate">${project.description || 'No description'}</p>
                    
                    <div class="mb-3">
                         <span class="badge rounded-pill ${statusClass} px-3 py-2 fw-normal">${capitalize(status)}</span>
                    </div>

                    <div class="d-flex align-items-center justify-content-between pt-3 border-top">
                        <div class="d-flex -space-x-2">
                            <!-- Avatars (Mock) -->
                             <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center border border-white" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                ${(project.name || 'P').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-1 ${daysClass}">
                            <span class="material-icons-round fs-6">schedule</span>
                            <small class="fw-medium">${daysText}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        projectListContainer.appendChild(col);
    });
}

/**
 * Open Modal for Adding
 */
function openAddProjectModal() {
    editingProjectId = null;
    document.getElementById('modalTitle').textContent = 'Add New Project';
    projectForm.reset();
    resetManagerDropdown();
    resetClientDropdown();

    // Set default dates
    const dateInput = document.getElementById('projectDate');
    const startDateInput = document.getElementById('projectStartDate');
    if (dateInput) dateInput.valueAsDate = new Date();
    if (startDateInput) startDateInput.valueAsDate = new Date();

    document.getElementById('deleteProjectBtn').classList.add('d-none');

    if (projectModalBS) projectModalBS.show();
}

/**
 * Open Modal for Editing
 */
window.editProject = async function (id) {
    resetManagerDropdown();
    resetClientDropdown();

    let project = projects.find(p => p.id === id);
    try {
        // Fetch detailed info if needed (like manager/client specifically if not in list)
        // But for now use what we have in list
        if (!project) {
            const response = await fetch(`${PROJECT_GET_BY_ID_API}?id=${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                project = data.data || data.result;
            }
        }
    } catch (e) { console.error(e); }

    if (!project) return;

    editingProjectId = id;
    document.getElementById('modalTitle').textContent = 'Edit Project';

    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDescription').value = project.description || '';

    if (project.startDate) {
        document.getElementById('projectStartDate').value = new Date(project.startDate).toISOString().split('T')[0];
    }
    if (project.dueDate) {
        document.getElementById('projectDate').value = new Date(project.dueDate).toISOString().split('T')[0];
    }

    // Set Manager UI
    const managerId = project.managerEmployeeId || project.ManagerEmployeeId;
    if (managerId) {
        // We need to fetch manager name to display it, or if we have it in list
        // Try getEmployeeById logic
        try {
            // Re-using logic or just fetch simple
            const response = await fetch(`${EMPLOYEE_GET_BY_ID_API}?EmployeeId=${managerId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                let employee = data.data || data;
                if (Array.isArray(employee)) employee = employee[0];

                if (employee) {
                    selectManager(managerId, `${employee.firstName} ${employee.lastName}`);
                } else {
                    selectManager(managerId, `Manager ID: ${managerId}`);
                }
            } else {
                selectManager(managerId, `Manager ID: ${managerId}`);
            }
        } catch (e) {
            selectManager(managerId, `Manager ID: ${managerId}`);
        }
    } else {
        resetManagerDropdown();
    }

    // Set Client UI
    if (project.clientId) {
        try {
            const response = await fetch(`${CLIENT_API}/${project.clientId}`);
            if (response.ok) {
                const client = await response.json();
                selectClient(project.clientId, `${client.firstName} ${client.lastName}`);
            } else {
                selectClient(project.clientId, `Client ID: ${project.clientId}`);
            }
        } catch (e) {
            selectClient(project.clientId, `Client ID: ${project.clientId}`);
        }
    } else {
        resetClientDropdown();
    }

    if (projectModalBS) projectModalBS.show();

    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) {
        deleteBtn.classList.remove('d-none');
        deleteBtn.onclick = () => confirmDelete(id);
    }
};

/**
 * Handle Form Submit
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    const startDate = document.getElementById('projectStartDate').value;
    const dueDate = document.getElementById('projectDate').value;
    const managerId = document.getElementById('projectManagerId').value;
    const clientId = document.getElementById('projectClientId').value;

    const formData = new FormData();
    formData.append('Name', name);
    formData.append('Description', description);

    if (startDate) {
        formData.append('StartDate', new Date(startDate).toISOString());
    }
    if (dueDate) {
        formData.append('DueDate', new Date(dueDate).toISOString());
    }

    if (managerId) {
        formData.append('ManagerEmployeeId', parseInt(managerId));
    }

    if (clientId) {
        formData.append('ClientId', parseInt(clientId));
    }

    // Status is not in the screenshot parameters, so omitting it or checking if needed.
    // The previous code had it. Let's omit "Status" if it's not in the list.

    console.log("Sending Project FormData");

    if (editingProjectId) {
        // For update, we might need ID. Usually update is PUT or POST with ID in body or query.
        // If the Add is FormData, Update likely is too.
        // Assuming Update API signature is similar + Id.
        formData.append('Id', editingProjectId);

        // API Update
        try {
            // Try PUT and append ID to URL just in case
            const response = await fetch(`${PROJECT_UPDATE_API}?id=${editingProjectId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                    // Content-Type header removed to let browser set it with boundary
                },
                body: formData
            });
            if (response.ok) {
                loadProjects(); // Reload to refresh list
                if (projectModalBS) projectModalBS.hide();
            } else {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    alert(`Failed to update project (Status ${response.status}): ${JSON.stringify(errorData)}`);
                    console.error("Update Error JSON:", errorData);
                } catch (e) {
                    alert(`Failed to update project (Status ${response.status}): ${errorText}`);
                    console.error("Update Error Text:", errorText);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error updating project: " + e.message);
        }

    } else {
        // API Add
        try {
            const response = await fetch(PROJECT_ADD_API, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                    // Content-Type header removed to let browser set it with boundary
                },
                body: formData
            });
            if (response.ok) {
                loadProjects();
                if (projectModalBS) projectModalBS.hide();
            } else {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    alert(`Failed to add project (Status ${response.status}): ${JSON.stringify(errorData)}`);
                    console.error("Add Error JSON:", errorData);
                } catch (e) {
                    alert(`Failed to add project (Status ${response.status}): ${errorText}`);
                    console.error("Add Error Text:", errorText);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error adding project: " + e.message);
        }
    }
}

/**
 * Delete Project
 */
window.confirmDelete = async function (id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            // Updated to use DELETE method with JSON body based on API docs (415 error fix)
            const response = await fetch(PROJECT_DELETE_API, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: parseInt(id) })
            });

            if (response.ok) {
                loadProjects();
                if (projectModalBS) projectModalBS.hide();
            } else {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    alert(`Failed to delete project (Status ${response.status}): ${JSON.stringify(errorData)}`);
                    console.error("Delete Error JSON:", errorData);
                } catch (e) {
                    alert(`Failed to delete project (Status ${response.status}): ${errorText}`);
                    console.error("Delete Error Text:", errorText);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting project: " + e.message);
        }
    }
};

/**
 * Utilities
 */
function getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2 - date1) / oneDay);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    if (addProjectBtn) addProjectBtn.addEventListener('click', openAddProjectModal);
    if (projectForm) projectForm.addEventListener('submit', handleFormSubmit);
    if (searchInput) searchInput.addEventListener('input', renderProjects);
    if (sortBySelect) sortBySelect.addEventListener('change', renderProjects);
}

// Run init
document.addEventListener('DOMContentLoaded', init);
