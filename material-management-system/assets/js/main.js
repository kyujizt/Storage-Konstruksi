/**
 * Main JavaScript file for Material Management System
 */

// Global variables
const BASE_URL = ''; // Base URL for API calls (empty for same origin)
let currentUser = null;

// Helper Functions
const showLoader = () => {
    const loader = document.createElement('div');
    loader.className = 'loader-container';
    loader.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loader);
};

const hideLoader = () => {
    const loader = document.querySelector('.loader-container');
    if (loader) {
        loader.remove();
    }
};

const showAlert = (message, type = 'info') => {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;

    // Find alert container or create one
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        const mainContent = document.querySelector('main') || document.body;
        mainContent.insertAdjacentElement('afterbegin', alertContainer);
    }

    alertContainer.appendChild(alertBox);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertBox.remove();
        if (alertContainer.children.length === 0) {
            alertContainer.remove();
        }
    }, 5000);
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

const formatNumber = (number) => {
    return parseFloat(number).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

// API Functions
const api = {
    get: async (endpoint, params = {}) => {
        try {
            showLoader();
            const queryParams = new URLSearchParams();
            for (const key in params) {
                if (params[key] !== undefined && params[key] !== null) {
                    queryParams.append(key, params[key]);
                }
            }

            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await fetch(`${BASE_URL}${endpoint}${queryString}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            showAlert(error.message, 'danger');
            throw error;
        } finally {
            hideLoader();
        }
    },

    post: async (endpoint, data = {}) => {
        try {
            showLoader();
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'API request failed');
            }
            
            return result;
        } catch (error) {
            showAlert(error.message, 'danger');
            throw error;
        } finally {
            hideLoader();
        }
    },

    put: async (endpoint, data = {}) => {
        try {
            showLoader();
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'API request failed');
            }
            
            return result;
        } catch (error) {
            showAlert(error.message, 'danger');
            throw error;
        } finally {
            hideLoader();
        }
    },

    delete: async (endpoint) => {
        try {
            showLoader();
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'API request failed');
            }
            
            return result;
        } catch (error) {
            showAlert(error.message, 'danger');
            throw error;
        } finally {
            hideLoader();
        }
    }
};

// Modal Functions
const modal = {
    open: (content, title = '') => {
        // Create modal if it doesn't exist
        let modalElement = document.getElementById('modal');
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'modal';
            modalElement.className = 'modal';
            document.body.appendChild(modalElement);
        }

        modalElement.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Show modal
        modalElement.style.display = 'block';

        // Add event listeners
        const closeButton = modalElement.querySelector('.modal-close');
        closeButton.addEventListener('click', modal.close);

        // Close when clicking outside the modal content
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                modal.close();
            }
        });
    },

    close: () => {
        const modalElement = document.getElementById('modal');
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }
};

// Check authentication status
const checkAuth = async () => {
    try {
        const user = await api.get('/backend/auth/check.php');
        currentUser = user.data;
        return true;
    } catch (error) {
        // Redirect to login if not on login page
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }
};

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the active navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        if (currentPath.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });

    // Initialize logout button if exists
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await api.get('/backend/auth/logout.php');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
});

// Form validation
const validateForm = (form) => {
    const requiredFields = form.querySelectorAll('[required]');
    let valid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            const fieldName = field.getAttribute('name') || 'This field';
            showAlert(`${fieldName} is required`, 'danger');
            valid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });

    return valid;
};

// Export functions and objects that should be accessible globally
window.app = {
    api,
    modal,
    showAlert,
    formatDate,
    formatNumber,
    validateForm
};
