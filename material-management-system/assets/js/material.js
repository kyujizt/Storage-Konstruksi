/**
 * JavaScript for Materials Management
 */

// Global variables
let materialsList = [];
let categories = [];
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let selectedCategoryId = 0;

// Initialize Materials page
const initializeMaterialsPage = async () => {
    try {
        // Load categories for filter dropdown
        await loadCategories();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial materials data
        await loadMaterials();
    } catch (error) {
        console.error('Failed to initialize materials page:', error);
        app.showAlert('Failed to load materials data. Please try again later.', 'danger');
    }
};

// Load material categories
const loadCategories = async () => {
    try {
        const result = await app.api.get('/backend/api/categories.php');
        categories = result.data;
        
        // Populate category filter dropdown
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            let options = '<option value="0">All Categories</option>';
            categories.forEach(category => {
                options += `<option value="${category.category_id}">${category.category_name}</option>`;
            });
            categoryFilter.innerHTML = options;
        }
        
        // Populate category select in add/edit form
        const categorySelect = document.getElementById('material-category');
        if (categorySelect) {
            let options = '<option value="">Select Category</option>';
            categories.forEach(category => {
                options += `<option value="${category.category_id}">${category.category_name}</option>`;
            });
            categorySelect.innerHTML = options;
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        app.showAlert('Failed to load categories. Please try again later.', 'danger');
    }
};

// Load materials data with pagination
const loadMaterials = async () => {
    try {
        const params = {
            page: currentPage,
            limit: 10
        };
        
        if (searchTerm) {
            params.search = searchTerm;
        }
        
        if (selectedCategoryId > 0) {
            params.category_id = selectedCategoryId;
        }
        
        const result = await app.api.get('/backend/api/materials.php', params);
        materialsList = result.data;
        totalPages = result.pagination.pages;
        
        renderMaterialsTable();
        updatePagination();
    } catch (error) {
        console.error('Failed to load materials:', error);
        app.showAlert('Failed to load materials. Please try again later.', 'danger');
    }
};

// Render materials table
const renderMaterialsTable = () => {
    const tableBody = document.getElementById('materials-table-body');
    if (!tableBody) return;
    
    if (materialsList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No materials found</td></tr>';
        return;
    }
    
    let rows = '';
    materialsList.forEach(material => {
        const stockStatus = getStockStatus(material.stock_quantity, material.min_stock_level);
        rows += `
            <tr>
                <td>${material.material_name}</td>
                <td>${material.category_name || 'Uncategorized'}</td>
                <td>${material.unit}</td>
                <td>${app.formatNumber(material.stock_quantity)} ${material.unit}</td>
                <td>
                    <span class="status ${stockStatus.class}">${stockStatus.label}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary view-material" data-id="${material.material_id}">View</button>
                    <button class="btn btn-sm btn-success edit-material" data-id="${material.material_id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-material" data-id="${material.material_id}">Delete</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rows;
    
    // Add event listeners to action buttons
    tableBody.querySelectorAll('.view-material').forEach(btn => {
        btn.addEventListener('click', () => viewMaterial(btn.dataset.id));
    });
    
    tableBody.querySelectorAll('.edit-material').forEach(btn => {
        btn.addEventListener('click', () => openEditMaterialForm(btn.dataset.id));
    });
    
    tableBody.querySelectorAll('.delete-material').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteMaterial(btn.dataset.id));
    });
};

// Get stock status indicator
const getStockStatus = (quantity, minLevel) => {
    if (quantity <= 0) {
        return { label: 'Out of Stock', class: 'status-danger' };
    } else if (quantity <= minLevel) {
        return { label: 'Low Stock', class: 'status-warning' };
    } else {
        return { label: 'In Stock', class: 'status-success' };
    }
};

// Update pagination controls
const updatePagination = () => {
    const paginationElement = document.getElementById('pagination');
    if (!paginationElement) return;
    
    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `
        <button class="btn ${currentPage === 1 ? 'btn-secondary disabled' : 'btn-primary'}" 
            ${currentPage === 1 ? 'disabled' : 'onclick="changePage(' + (currentPage - 1) + ')"'}>
            &laquo; Previous
        </button>
    `;
    
    // Page info
    paginationHtml += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    
    // Next button
    paginationHtml += `
        <button class="btn ${currentPage === totalPages ? 'btn-secondary disabled' : 'btn-primary'}" 
            ${currentPage === totalPages ? 'disabled' : 'onclick="changePage(' + (currentPage + 1) + ')"'}>
            Next &raquo;
        </button>
    `;
    
    paginationElement.innerHTML = paginationHtml;
};

// Change page
const changePage = (page) => {
    currentPage = page;
    loadMaterials();
};

// Setup event listeners
const setupEventListeners = () => {
    // Search form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchTerm = document.getElementById('search-input').value.trim();
            currentPage = 1; // Reset to first page when searching
            loadMaterials();
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            selectedCategoryId = parseInt(categoryFilter.value);
            currentPage = 1; // Reset to first page when filtering
            loadMaterials();
        });
    }
    
    // Add material button
    const addMaterialBtn = document.getElementById('add-material-btn');
    if (addMaterialBtn) {
        addMaterialBtn.addEventListener('click', openAddMaterialForm);
    }
};

// View material details
const viewMaterial = async (materialId) => {
    try {
        const result = await app.api.get('/backend/api/materials.php', { id: materialId });
        const material = result.data;
        
        const modalContent = `
            <div class="material-details">
                <h2>${material.material_name}</h2>
                <p><strong>Category:</strong> ${material.category_name || 'Uncategorized'}</p>
                <p><strong>Description:</strong> ${material.description || 'No description'}</p>
                <p><strong>Unit:</strong> ${material.unit}</p>
                <p><strong>Current Stock:</strong> ${app.formatNumber(material.stock_quantity)} ${material.unit}</p>
                <p><strong>Minimum Stock Level:</strong> ${app.formatNumber(material.min_stock_level)} ${material.unit}</p>
                <p><strong>Stock Status:</strong> <span class="status ${getStockStatus(material.stock_quantity, material.min_stock_level).class}">
                    ${getStockStatus(material.stock_quantity, material.min_stock_level).label}
                </span></p>
                
                <div class="stock-actions">
                    <button class="btn btn-success" onclick="openStockInForm(${material.material_id})">Stock In</button>
                    <button class="btn btn-primary" onclick="openStockOutForm(${material.material_id})">Stock Out</button>
                </div>
            </div>
        `;
        
        app.modal.open(modalContent, 'Material Details');
    } catch (error) {
        console.error('Failed to load material details:', error);
        app.showAlert('Failed to load material details. Please try again later.', 'danger');
    }
};

// Open add material form
const openAddMaterialForm = () => {
    const formHtml = `
        <form id="material-form" class="form">
            <div class="form-group">
                <label for="material-name">Material Name *</label>
                <input type="text" id="material-name" name="material_name" required>
            </div>
            
            <div class="form-group">
                <label for="material-description">Description</label>
                <textarea id="material-description" name="description" rows="3"></textarea>
            </div>
            
            <div class="form-group">
                <label for="material-unit">Unit *</label>
                <input type="text" id="material-unit" name="unit" required placeholder="e.g., kg, pieces, m³">
            </div>
            
            <div class="form-group">
                <label for="material-category">Category</label>
                <select id="material-category" name="category_id">
                    <option value="">Select Category</option>
                    ${categories.map(category => `<option value="${category.category_id}">${category.category_name}</option>`).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="min-stock-level">Minimum Stock Level</label>
                <input type="number" id="min-stock-level" name="min_stock_level" min="0" step="0.01" value="0">
            </div>
            
            <div class="form-group">
                <label for="initial-quantity">Initial Stock Quantity</label>
                <input type="number" id="initial-quantity" name="initial_quantity" min="0" step="0.01" value="0">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-danger" onclick="app.modal.close()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Material</button>
            </div>
        </form>
    `;
    
    app.modal.open(formHtml, 'Add New Material');
    
    // Setup form submission
    const form = document.getElementById('material-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!app.validateForm(form)) return;
        
        const formData = {
            material_name: document.getElementById('material-name').value,
            description: document.getElementById('material-description').value,
            unit: document.getElementById('material-unit').value,
            category_id: document.getElementById('material-category').value || null,
            min_stock_level: document.getElementById('min-stock-level').value,
            initial_quantity: document.getElementById('initial-quantity').value
        };
        
        try {
            await app.api.post('/backend/api/materials.php', formData);
            app.showAlert('Material added successfully', 'success');
            app.modal.close();
            loadMaterials(); // Reload the materials list
        } catch (error) {
            console.error('Failed to add material:', error);
        }
    });
};

// Open edit material form
const openEditMaterialForm = async (materialId) => {
    try {
        const result = await app.api.get('/backend/api/materials.php', { id: materialId });
        const material = result.data;
        
        const formHtml = `
            <form id="material-edit-form" class="form">
                <input type="hidden" id="edit-material-id" value="${material.material_id}">
                
                <div class="form-group">
                    <label for="edit-material-name">Material Name *</label>
                    <input type="text" id="edit-material-name" name="material_name" value="${material.material_name}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-material-description">Description</label>
                    <textarea id="edit-material-description" name="description" rows="3">${material.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="edit-material-unit">Unit *</label>
                    <input type="text" id="edit-material-unit" name="unit" value="${material.unit}" required>
                </div>
                
                <div class="form-group">
                    <label for="edit-material-category">Category</label>
                    <select id="edit-material-category" name="category_id">
                        <option value="">Select Category</option>
                        ${categories.map(category => 
                            `<option value="${category.category_id}" ${category.category_id == material.category_id ? 'selected' : ''}>
                                ${category.category_name}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="edit-min-stock-level">Minimum Stock Level</label>
                    <input type="number" id="edit-min-stock-level" name="min_stock_level" min="0" step="0.01" value="${material.min_stock_level}">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-danger" onclick="app.modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Material</button>
                </div>
            </form>
        `;
        
        app.modal.open(formHtml, 'Edit Material');
        
        // Setup form submission
        const form = document.getElementById('material-edit-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!app.validateForm(form)) return;
            
            const formData = {
                material_id: document.getElementById('edit-material-id').value,
                material_name: document.getElementById('edit-material-name').value,
                description: document.getElementById('edit-material-description').value,
                unit: document.getElementById('edit-material-unit').value,
                category_id: document.getElementById('edit-material-category').value || null,
                min_stock_level: document.getElementById('edit-min-stock-level').value
            };
            
            try {
                await app.api.put('/backend/api/materials.php', formData);
                app.showAlert('Material updated successfully', 'success');
                app.modal.close();
                loadMaterials(); // Reload the materials list
            } catch (error) {
                console.error('Failed to update material:', error);
            }
        });
    } catch (error) {
        console.error('Failed to load material for editing:', error);
        app.showAlert('Failed to load material data. Please try again later.', 'danger');
    }
};

// Confirm delete material
const confirmDeleteMaterial = (materialId) => {
    const material = materialsList.find(m => m.material_id == materialId);
    if (!material) return;
    
    const confirmHtml = `
        <div class="confirm-delete">
            <p>Are you sure you want to delete <strong>${material.material_name}</strong>?</p>
            <p>This action cannot be undone. All inventory records for this material will also be deleted.</p>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="app.modal.close()">Cancel</button>
                <button type="button" class="btn btn-danger" onclick="deleteMaterial(${materialId})">Delete Material</button>
            </div>
        </div>
    `;
    
    app.modal.open(confirmHtml, 'Confirm Delete');
};

// Delete material
const deleteMaterial = async (materialId) => {
    try {
        await app.api.delete(`/backend/api/materials.php?id=${materialId}`);
        app.showAlert('Material deleted successfully', 'success');
        app.modal.close();
        loadMaterials(); // Reload the materials list
    } catch (error) {
        console.error('Failed to delete material:', error);
    }
};

// Open stock in form
const openStockInForm = (materialId) => {
    const material = materialsList.find(m => m.material_id == materialId);
    if (!material) return;
    
    const formHtml = `
        <form id="stock-in-form" class="form">
            <input type="hidden" id="stock-material-id" value="${material.material_id}">
            
            <div class="form-group">
                <label>Material: <strong>${material.material_name}</strong></label>
            </div>
            
            <div class="form-group">
                <label for="stock-in-quantity">Quantity *</label>
                <input type="number" id="stock-in-quantity" name="quantity" min="0.01" step="0.01" required>
                <small>${material.unit}</small>
            </div>
            
            <div class="form-group">
                <label for="stock-in-supplier">Supplier</label>
                <select id="stock-in-supplier" name="supplier_id">
                    <option value="">Select Supplier</option>
                    <!-- Suppliers will be loaded dynamically -->
                </select>
            </div>
            
            <div class="form-group">
                <label for="stock-in-price">Unit Price</label>
                <input type="number" id="stock-in-price" name="unit_price" min="0" step="0.01">
            </div>
            
            <div class="form-group">
                <label for="stock-in-notes">Notes</label>
                <textarea id="stock-in-notes" name="notes" rows="2"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-danger" onclick="app.modal.close()">Cancel</button>
                <button type="submit" class="btn btn-success">Add Stock</button>
            </div>
        </form>
    `;
    
    app.modal.open(formHtml, 'Stock In');
    
    // Load suppliers for dropdown
    loadSuppliers();
    
    // Setup form submission
    const form = document.getElementById('stock-in-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!app.validateForm(form)) return;
        
        const formData = {
            material_id: document.getElementById('stock-material-id').value,
            quantity: document.getElementById('stock-in-quantity').value,
            supplier_id: document.getElementById('stock-in-supplier').value || null,
            unit_price: document.getElementById('stock-in-price').value || null,
            notes: document.getElementById('stock-in-notes').value
        };
        
        try {
            await app.api.post('/backend/api/inventory.php', formData);
            app.showAlert('Stock added successfully', 'success');
            app.modal.close();
            loadMaterials(); // Reload the materials list
        } catch (error) {
            console.error('Failed to add stock:', error);
        }
    });
};

// Open stock out form
const openStockOutForm = (materialId) => {
    const material = materialsList.find(m => m.material_id == materialId);
    if (!material) return;
    
    const formHtml = `
        <form id="stock-out-form" class="form">
            <input type="hidden" id="stock-material-id" value="${material.material_id}">
            
            <div class="form-group">
                <label>Material: <strong>${material.material_name}</strong></label>
            </div>
            
            <div class="form-group">
                <label>Current Stock: <strong>${app.formatNumber(material.stock_quantity)} ${material.unit}</strong></label>
            </div>
            
            <div class="form-group">
                <label for="stock-out-quantity">Quantity to Remove *</label>
                <input type="number" id="stock-out-quantity" name="quantity" min="0.01" step="0.01" max="${material.stock_quantity}" required>
                <small>${material.unit}</small>
            </div>
            
            <div class="form-group">
                <label for="stock-out-project">Project</label>
                <select id="stock-out-project" name="project_id">
                    <option value="">Select Project</option>
                    <!-- Projects will be loaded dynamically -->
                </select>
            </div>
            
            <div class="form-group">
                <label for="stock-out-notes">Notes</label>
                <textarea id="stock-out-notes" name="notes" rows="2"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-danger" onclick="app.modal.close()">Cancel</button>
                <button type="submit" class="btn btn-primary">Remove Stock</button>
            </div>
        </form>
    `;
    
    app.modal.open(formHtml, 'Stock Out');
    
    // Load projects for dropdown
    loadProjects();
    
    // Setup form submission
    const form = document.getElementById('stock-out-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!app.validateForm(form)) return;
        
        const quantity = parseFloat(document.getElementById('stock-out-quantity').value);
        const maxQuantity = parseFloat(material.stock_quantity);
        
        if (quantity > maxQuantity) {
            app.showAlert(`Cannot remove more than available stock (${maxQuantity} ${material.unit})`, 'danger');
            return;
        }
        
        const formData = {
            material_id: document.getElementById('stock-material-id').value,
            quantity: quantity,
            project_id: document.getElementById('stock-out-project').value || null,
            notes: document.getElementById('stock-out-notes').value
        };
        
        try {
            await app.api.put('/backend/api/inventory.php', formData);
            app.showAlert('Stock removed successfully', 'success');
            app.modal.close();
            loadMaterials(); // Reload the materials list
        } catch (error) {
            console.error('Failed to remove stock:', error);
        }
    });
};

// Load suppliers for dropdown
const loadSuppliers = async () => {
    const supplierSelect = document.getElementById('stock-in-supplier');
    if (!supplierSelect) return;
    
    try {
        const result = await app.api.get('/backend/api/suppliers.php');
        const suppliers = result.data;
        
        let options = '<option value="">Select Supplier</option>';
        suppliers.forEach(supplier => {
            options += `<option value="${supplier.supplier_id}">${supplier.name}</option>`;
        });
        
        supplierSelect.innerHTML = options;
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        app.showAlert('Failed to load suppliers list', 'warning');
    }
};

// Load projects for dropdown
const loadProjects = async () => {
    const projectSelect = document.getElementById('stock-out-project');
    if (!projectSelect) return;
    
    try {
        const result = await app.api.get('/backend/api/projects.php');
        const projects = result.data;
        
        let options = '<option value="">Select Project</option>';
        projects.forEach(project => {
            options += `<option value="${project.project_id}">${project.project_name}</option>`;
        });
        
        projectSelect.innerHTML = options;
    } catch (error) {
        console.error('Failed to load projects:', error);
        app.showAlert('Failed to load projects list', 'warning');
    }
};

// Make functions available globally
window.initializeMaterialsPage = initializeMaterialsPage;
window.changePage = changePage;
window.viewMaterial = viewMaterial;
window.openAddMaterialForm = openAddMaterialForm;
window.openEditMaterialForm = openEditMaterialForm;
window.confirmDeleteMaterial = confirmDeleteMaterial;
window.deleteMaterial = deleteMaterial;
window.openStockInForm = openStockInForm;
window.openStockOutForm = openStockOutForm;
