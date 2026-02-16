/**
 * Manager Dropdown Logic
 * Handles the manager selection, infinite scroll, and search.
 */

// Manager Dropdown State
const managerState = {
    managers: [], // Currently loaded managers
    currentPage: 1,
    pageSize: 3, // As requested: 3 items per load
    hasMore: true,
    searchQuery: '',
    selectedManager: null,
    isLoading: false,
    observer: null, // For IntersectionObserver
    cache: {} // Cache: { 'query_page': { records: [], hasMore: boolean } }
};

/**
 * Initialize Manager Dropdown
 */
async function initManagerDropdown() {
    const dropdownInput = document.getElementById('managerSearchInput');

    if (dropdownInput) {
        dropdownInput.addEventListener('input', (e) => {
            managerState.searchQuery = e.target.value.toLowerCase();
            filterManagers();
        });
    }

    // Infinite Scroll Implementation using IntersectionObserver
    setupInfiniteScroll();

    // Initial Load
    await loadManagers(1, false);
}

function setupInfiniteScroll() {
    const container = document.getElementById('managerListContainer');
    if (!container) return;

    // Create sentinel if not exists
    let sentinel = document.getElementById('manager-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'manager-sentinel';
        sentinel.className = 'p-1'; // minimal height
        container.appendChild(sentinel);
    }

    if (managerState.observer) managerState.observer.disconnect();

    managerState.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !managerState.isLoading && managerState.hasMore) {
            loadManagers(managerState.currentPage + 1, true);
        }
    }, {
        root: container,
        threshold: 0.1
    });

    managerState.observer.observe(sentinel);
}

/**
 * Load Managers (Paginated / Infinite Scroll)
 */
async function loadManagers(page = 1, append = false) {
    if (managerState.isLoading) return;
    if (page > 1 && !managerState.hasMore) return;

    managerState.isLoading = true;
    managerState.currentPage = page;

    // Cache Key Generator
    const cacheKey = `${managerState.searchQuery.trim()}_${page}`;

    const managerList = document.getElementById('managerList');

    // Check Cache First
    if (managerState.cache[cacheKey]) {
        console.log(`Using cached data for: ${cacheKey}`);
        const cached = managerState.cache[cacheKey];
        managerState.hasMore = cached.hasMore;

        if (append) {
            managerState.managers = [...managerState.managers, ...cached.records];
        } else {
            managerState.managers = cached.records;
        }

        renderManagerList(append);
        managerState.isLoading = false;
        return; // Skip API call
    }

    // Show loading text only if replacing
    if (!append && managerList) {
        managerList.innerHTML = '<div class="p-3 text-center text-muted small"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Loading...</div>';
    }

    // Show small loader at bottom if appending
    const sentinel = document.getElementById('manager-sentinel');
    if (append && sentinel) {
        sentinel.innerHTML = '<div class="text-center small text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';
    }

    try {
        const skip = (page - 1) * managerState.pageSize;
        const take = managerState.pageSize;

        let url = `${PROJECT_EMPLOYEE_API}?skip=${skip}&take=${take}`;
        if (managerState.searchQuery) {
            url += `&search=${encodeURIComponent(managerState.searchQuery)}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            let records = [];
            if (Array.isArray(data)) {
                records = data;
            } else if (data.data?.records) {
                records = data.data.records;
            } else if (data.data && Array.isArray(data.data)) {
                records = data.data;
            } else if (data.result && Array.isArray(data.result)) {
                records = data.result;
            }

            records = records.map(user => {
                if (user.id) user.id = user.id.toString();
                user.firstName = user.firstName || user.FirstName || '';
                user.lastName = user.lastName || user.LastName || '';
                return user;
            });

            // Check if we reached end
            let hasMore = true;
            if (records.length < managerState.pageSize) {
                hasMore = false;
            }
            managerState.hasMore = hasMore;

            // Save to Cache
            managerState.cache[cacheKey] = {
                records: records,
                hasMore: hasMore
            };

            if (append) {
                managerState.managers = [...managerState.managers, ...records];
            } else {
                managerState.managers = records;
            }

            renderManagerList(append);
        } else {
            console.error("Failed to load managers");
            if (!append && managerList) managerList.innerHTML = '<div class="p-3 text-center text-danger small">Failed to load</div>';
        }
    } catch (e) {
        console.error("Error loading managers:", e);
    } finally {
        managerState.isLoading = false;
        if (sentinel) sentinel.innerHTML = ''; // Clear loader
    }
}

/**
 * Filter Managers
 */
function filterManagers() {
    managerState.hasMore = true;
    managerState.managers = [];
    loadManagers(1, false);
}

/**
 * Render Manager List
 */
function renderManagerList(append = false) {
    const container = document.getElementById('managerList');
    if (!container) return;

    if (!append) {
        container.innerHTML = '';
    }

    if (managerState.managers.length === 0 && !append) {
        container.innerHTML = '<div class="p-3 text-center text-muted small">No managers found</div>';
    } else {
        const fragment = document.createDocumentFragment();

        const startIndex = append ? (managerState.currentPage - 1) * managerState.pageSize : 0;
        const items = managerState.managers.slice(startIndex);

        items.forEach(manager => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action border-0 px-3 py-2 small ${managerState.selectedManager && managerState.selectedManager.id === manager.id ? 'active' : ''}`;
            item.textContent = `${manager.firstName} ${manager.lastName || ''}`;

            item.onclick = (e) => {
                e.preventDefault();
                selectManager(manager.id, `${manager.firstName} ${manager.lastName || ''}`);
            };
            fragment.appendChild(item);
        });

        container.appendChild(fragment);
    }
}

/**
 * Select Manager
 */
function selectManager(id, name) {
    document.getElementById('projectManagerId').value = id;
    document.getElementById('managerDropdownText').textContent = name;
    managerState.selectedManager = { id, name };
}

/**
 * Reset Manager Dropdown
 */
function resetManagerDropdown() {
    document.getElementById('projectManagerId').value = '';
    document.getElementById('managerDropdownText').textContent = 'Select Manager';
    document.getElementById('managerSearchInput').value = '';

    managerState.searchQuery = '';
    managerState.currentPage = 1;
    managerState.selectedManager = null;
    managerState.hasMore = true;
    managerState.managers = [];
    loadManagers(1, false);
}
