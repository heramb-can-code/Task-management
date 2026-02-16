/**
 * App.js
 * Main application logic for Shardeen Task Manager
 */

const authToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJJZCI6IjE2MTA0YTAwLTllYmMtNGQwMS04YTE1LWZjOTIwZjgwZmM4YiIsImp0aSI6IjExMGNhYTg4LTRmM2ItNDNmNi1iYTY0LTBjOTA3OTc2NjdjMCIsIm5hbWVpZCI6IjRiMjI4OGQyLWE4ZDctNGUwOC05NWIxLTExYjZmZWQyYTg3MCIsInVuaXF1ZV9uYW1lIjoiRU1QMDAwMDAyIiwiZW1haWwiOiJkZXZlbG9wZXJAc2hhcmRlZW4uY29tIiwiT3JnYW5pemF0aW9uSWQiOiIxNSIsIkNvbXBhbnlJZCI6IjE2Iiwicm9sZSI6WyJPcmdhbml6YXRpb24gQWRtaW4iLCJFbXBsb3llZSJdLCJuYmYiOjE3NzA4MDQ3ODAsImV4cCI6MTc3MDg5MTE4MCwiaWF0IjoxNzcwODA0NzgwLCJpc3MiOiJzaGFyZGVlbi1hbGxveS1pc3N1ZXIxIiwiYXVkIjoic2hhcmRlZW4tYWxsb3ktYXVkaWVuY2UxIn0.o9qL3_dOaSwCklxqJ_7-htA1rnMR8dETYIiPf8fTUODt8bQ9Pcxk2kqTGQkm3-3TTrsimpE2jvT0KyHfRoHhEA";
const API_URL = "https://api.alloy.shardeen.com/api/v1.0/project-management/task/add";
// State Management
let tasks = [];
let editingTaskId = null;
let taskModalBS = null;

const STORAGE_KEY = 'shardeen_tasks';

// DOM Elements
const taskListContainer = document.getElementById('taskListContainer');
const taskForm = document.getElementById('taskForm');
const addTaskBtn = document.getElementById('addTaskBtn');
const cancelBtn = document.getElementById('cancelBtn');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const emptyStateInfo = document.getElementById('emptyState');

// Stats Elements
const totalTasksEl = document.getElementById('totalTasks');
const inProgressTasksEl = document.getElementById('inProgressTasks');
const completedTasksEl = document.getElementById('completedTasks');

/**
 * Initialize App
 */
function init() {
    // Initialize Bootstrap Modal
    const modalEl = document.getElementById('taskModal');
    if (modalEl) {
        taskModalBS = new bootstrap.Modal(modalEl);
    }

    loadTasks();
    renderTasks();
    updateStats();
    setupEventListeners();
}

/**
 * Load tasks from LocalStorage
 */
function loadTasks() {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        // Initial Dummy Data
        tasks = [
            {
                id: Date.now().toString(),
                name: 'Design Homepage Mockup',
                assignee: 'Alex',
                dueDate: '2024-03-25',
                priority: 'high',
                status: 'progress'
            },
            {
                id: (Date.now() - 1000).toString(),
                name: 'Setup Database Schema',
                assignee: 'Sam',
                dueDate: '2024-03-28',
                priority: 'medium',
                status: 'todo'
            }
        ];
        saveTasks();
    }
}

/**
 * Save tasks to LocalStorage
 */
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    updateStats();
}

/**
 * Render Tasks List
 */
function renderTasks() {
    taskListContainer.innerHTML = '';

    // Filter Logic
    const searchText = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const priorityFilter = filterPriority.value;

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(searchText) || task.assignee.toLowerCase().includes(searchText);
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    if (filteredTasks.length === 0) {
        if (emptyStateInfo) emptyStateInfo.classList.remove('d-none');
        return;
    }

    if (emptyStateInfo) emptyStateInfo.classList.add('d-none');

    filteredTasks.forEach(task => {
        const tr = document.createElement('tr');

        // Priority Badge Class
        let priorityClass = 'bg-secondary';
        if (task.priority === 'high') priorityClass = 'bg-danger-subtle text-danger';
        if (task.priority === 'medium') priorityClass = 'bg-warning-subtle text-warning';
        if (task.priority === 'low') priorityClass = 'bg-success-subtle text-success';

        // Status Badge Class
        let statusClass = 'bg-secondary';
        if (task.status === 'todo') statusClass = 'bg-light text-secondary border';
        if (task.status === 'progress') statusClass = 'bg-primary-subtle text-primary';
        if (task.status === 'done') statusClass = 'bg-success-subtle text-success';

        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center gap-2">
                    <input class="form-check-input" type="checkbox" ${task.status === 'done' ? 'checked' : ''} onchange="toggleTaskStatus('${task.id}')">
                    <span class="${task.status === 'done' ? 'text-decoration-line-through text-muted' : 'fw-medium'}">${task.name}</span>
                </div>
            </td>
            <td>${task.assignee}</td>
            <td>${formatDate(task.dueDate)}</td>
            <td><span class="badge ${priorityClass} rounded-pill fw-normal text-uppercase" style="font-size: 0.7rem;">${capitalize(task.priority)}</span></td>
            <td><span class="badge ${statusClass} rounded-pill fw-normal text-uppercase" style="font-size: 0.7rem;">${formatStatus(task.status)}</span></td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm btn-light text-secondary border-0" onclick="editTask('${task.id}')">
                    <span class="material-icons-round fs-6">edit</span>
                </button>
                <button class="btn btn-sm btn-light text-danger border-0 ms-1" onclick="deleteTask('${task.id}')">
                    <span class="material-icons-round fs-6">delete</span>
                </button>
            </td>
        `;

        taskListContainer.appendChild(tr);
    });
}

/**
 * Update Dashboard Stats
 */
function updateStats() {
    totalTasksEl.textContent = tasks.length;
    inProgressTasksEl.textContent = tasks.filter(t => t.status === 'progress').length;
    completedTasksEl.textContent = tasks.filter(t => t.status === 'done').length;
}

/**
 * CRUD Operations
 */

// Open Modal for New Task
function openAddTaskModal() {
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    taskForm.reset();

    // Set default date to today
    const dateInput = document.getElementById('taskDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    if (taskModalBS) taskModalBS.show();
}

// Open Modal for Editing
window.editTask = function (id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    document.getElementById('modalTitle').textContent = 'Edit Task';

    document.getElementById('taskName').value = task.name;
    document.getElementById('asigneeSelect').value = task.assignee;
    document.getElementById('taskDate').value = task.dueDate;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;

    if (taskModalBS) taskModalBS.show();
};

// Handle Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();

    // Correct IDs based on dashboard.html
    const taskNameInput = document.getElementById('taskName');
    const taskAssigneeInput = document.getElementById('asigneeSelect'); // Fixed ID
    const taskDateInput = document.getElementById('taskDate');
    const taskPriorityInput = document.getElementById('taskPriority');
    const taskStatusInput = document.getElementById('taskStatus');

    const taskData = {
        name: taskNameInput.value,
        assignee: taskAssigneeInput.value,
        dueDate: taskDateInput.value,
        priority: taskPriorityInput.value,
        status: taskStatusInput.value
    };

    if (editingTaskId) {
        // Update existing
        const index = tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...taskData };
        }
    } else {
        // Create new task

        // 1. Send to Server (API Integration)
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Success:', result);
            } else {
                console.error('Server Error:', response.statusText);
            }
        } catch (error) {
            console.error('Network Error:', error);
        }

        // 2. Save Locally (Fallback/Optimistic UI)
        const newTask = {
            id: Date.now().toString(),
            ...taskData
        };
        tasks.push(newTask);
    }

    saveTasks();
    renderTasks();
    if (taskModalBS) taskModalBS.hide();
}

// Delete Task
window.deleteTask = function (id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }
};

// Toggle Status (Checkbox)
window.toggleTaskStatus = function (id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = task.status === 'done' ? 'todo' : 'done';
        saveTasks();
        renderTasks();
    }
};

/**
 * Utilities
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    // Fix for date parsing if needed, but standard input date is YYYY-MM-DD
    const date = new Date(dateString);
    // Adjust for timezone offset if necessary to show correct date, 
    // but usually local date string is fine for simple display
    // Using UTC to avoid day shifting if input is purely date
    const day = date.getUTCDate();
    // Simple fix to prevent "yesterday" bug if timezone issue occurs
    // For now just standard usage
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatus(status) {
    switch (status) {
        case 'todo': return 'To Do';
        case 'progress': return 'In Progress';
        case 'done': return 'Done';
        default: return status;
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    if (addTaskBtn) addTaskBtn.addEventListener('click', openAddTaskModal);

    // modal close via button is handled by data-bs-dismiss="modal"

    // Explicit cancel button handling if consistent logic needed
    // if(cancelBtn) cancelBtn.addEventListener('click', () => { if(taskModalBS) taskModalBS.hide(); });

    if (taskForm) taskForm.addEventListener('submit', handleFormSubmit);

    // Search & Filter
    if (searchInput) searchInput.addEventListener('input', renderTasks);
    if (filterStatus) filterStatus.addEventListener('change', renderTasks);
    if (filterPriority) filterPriority.addEventListener('change', renderTasks);
}

// Run init
document.addEventListener('DOMContentLoaded', init);
