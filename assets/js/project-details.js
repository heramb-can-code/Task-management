/**
 * Project Details Logic
 */

const PROJECT_GET_BY_ID_API = "https://api.alloy.shardeen.com/api/v1.0/project-management/project/get-by-id";
const PROJECT_EMPLOYEE_API = "https://api.alloy.shardeen.com/api/v1.0/hr/employee/get-by-query";
// authToken is already defined in auth.js which is loaded before this script

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("No project ID specified.");
        window.location.href = 'project.html';
        return;
    }

    await loadProjectDetails(projectId);
});

async function loadProjectDetails(id) {
    const loadingEl = document.getElementById('loading');
    const contentEl = document.getElementById('projectDetails');

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
            let project = data.data || data.result || data;

            // Populate UI
            document.getElementById('detailName').textContent = project.name;
            document.getElementById('detailDescription').textContent = project.description || 'No description provided.';

            // Status Badge
            const statusEl = document.getElementById('detailStatus');
            statusEl.textContent = capitalize(project.status);
            statusEl.className = `badge rounded-pill fs-6 px-3 py-2 ${getStatusClass(project.status)}`;

            // Dates
            document.getElementById('detailStartDate').textContent = formatDate(project.startDate);
            document.getElementById('detailDueDate').textContent = formatDate(project.dueDate);

            // Client (Hardcoded for now as per projects.js logic, or just show ID)
            document.getElementById('detailClient').textContent = project.clientId ? `Client ${project.clientId}` : 'No Client Assigned';

            // Manager
            const managerId = project.managerEmployeeId || project.ManagerEmployeeId;
            if (managerId) {
                fetchManagerName(managerId);
            }

            // Show content
            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');

        } else {
            loadingEl.innerHTML = `<div class="text-danger">Failed to load project details.</div>`;
        }
    } catch (error) {
        console.error(error);
        loadingEl.innerHTML = `<div class="text-danger">Error loading project.</div>`;
    }
}

async function fetchManagerName(managerId) {
    // We try to fetch from the employee API to get the name
    // Or we could have passed it via URL, but fetching is cleaner for a details page
    try {
        // Optimally we'd have a get-by-id for employee, but we only have get-by-query from projects.js work
        // Let's try to query for this specific ID if possible, or just re-use the "load all" verify
        // modifying to just show "Manager ID: X" if we can't easily fetch name without big overhead
        // But let's try a direct fetch if the API supports it, otherwise we might leave it as ID for now
        // consistent with previous task approach:

        // Strategy: Use the get-by-query but filter? Or just leave as "Assigned Manager"
        // Let's try to just display "Manager ID: ..." and maybe fetch if consistent

        // Re-using the logic from projects.js to fetch all managers might be heavy for one page 
        // but it's the only verified way we have right now.
        // Let's defer this specific "get name" unless we want to replicate loadAllManagers.
        // For now, I will display "Manager (ID: ...)" to be safe, or placeholder.

        // Actually, let's try to fetch all like projects.js did, caching it is fine.
        const response = await fetch(`${PROJECT_EMPLOYEE_API}?page=1&pageSize=1000`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            let records = [];
            if (Array.isArray(data)) records = data;
            else if (data.data?.records) records = data.data.records;
            else if (data.data) records = data.data;

            // Match loose equality
            const manager = records.find(m => m.id == managerId);
            if (manager) {
                document.getElementById('detailManager').textContent = `${manager.firstName} ${manager.lastName || ''}`;
                document.getElementById('managerInitial').textContent = manager.firstName.charAt(0).toUpperCase();
            } else {
                document.getElementById('detailManager').textContent = `Manager ID: ${managerId}`;
            }
        }

    } catch (e) {
        console.warn("Could not fetch manager details", e);
        document.getElementById('detailManager').textContent = `Manager ID: ${managerId}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusClass(status) {
    switch (status) {
        case 'active': return 'bg-success-subtle text-success';
        case 'completed': return 'bg-primary-subtle text-primary';
        case 'paused': return 'bg-warning-subtle text-warning';
        default: return 'bg-secondary text-white';
    }
}
