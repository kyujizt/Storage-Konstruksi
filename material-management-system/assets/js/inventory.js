/**
 * JavaScript for Inventory Management
 */

// Global variables
let inventoryList = [];
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let showLowStockOnly = false;

// Initialize Inventory page
const initializeInventoryPage = async () => {
    try {
        // Set up event listeners
        setupEventListeners();
        
        // Load initial inventory data
        await loadInventory();
    } catch (error) {
        console.error('Failed to initialize inventory page:', error);
        app.showAlert('Failed to load inventory data. Please try again later.', 'danger');
    }
};

// Load inventory data with pagination
const loadInventory = async () => {
    try {
        const params = {
            page: currentPage,
            limit: 10,
            search: searchTerm,
            low_stock: showLowStockOnly ? 1 : 0
        };
        
        const result = await app.api.get('/backend/api/inventory.php', params);
        inventoryList = result.data;
        totalPages = result.pagination.pages;
        
        renderInventoryTable();
        updatePagination();
        updateInventorySummary();
    } catch (error) {
        console.error('Failed to load inventory:', error);
        app.showAlert('Failed to load inventory data. Please try again later.', 'danger');
    }
};

// Render inventory table
const renderInventoryTable = () => {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;
    
    if (inventoryList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No inventory items found</td></tr>';
        return;
    }
    
    let rows = '';
    inventoryList.forEach(item => {
        const stockStatus = getStockStatus(item.stock_quantity, item.min_stock_level);
        rows += `
            <tr class="${stockStatus.rowClass || ''}">
                <td>${item.material_name}</td>
                <td>${item.category_name || 'Uncategorized'}</td>
                <td>${item.unit}</td>
                <td class="text-right">${app.formatNumber(item.stock_quantity)}</td>
                <td class="text-right">${app.formatNumber(item.min_stock_level)}</td>
                <td>
                    <span class="status ${stockStatus.class}">${stockStatus.label}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="openStockInForm(${item.material_id})">Stock In</button>
                    <button class="btn btn-sm btn-primary" onclick="openStockOutForm(${item.material_id})">Stock Out</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rows;
};

// Get stock status indicator
const getStockStatus = (quantity, minLevel) => {
    if (quantity <= 0) {
        return { 
            label: 'Out of Stock', 
            class: 'status-danger',
            rowClass: 'out-of-stock-row'
        };
    } else if (quantity <= minLevel) {
        return { 
            label: 'Low Stock', 
            class: 'status-warning',
            rowClass: 'low-stock-row'
        };
    } else {
        return { 
            label: 'In Stock', 
            class: 'status-success'
        };
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

// Update inventory summary
const updateInventorySummary = async () => {
    try {
        const result = await app.api.get('/backend/api/inventory_summary.php');
        const summary = result.data;
        
        const summaryElement = document.getElementById('inventory-summary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-boxes"></i></div>
                        <div class="stat-title">Total Materials</div>
                        <div class="stat-value">${summary.total_materials}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="stat-title">Low Stock Items</div>
                        <div class="stat-value">${summary.low_stock_count}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-ban"></i></div>
                        <div class="stat-title">Out of Stock</div>
                        <div class="stat-value">${summary.out_of_stock_count}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="stat-title">Total Inventory Value</div>
                        <div class="stat-value">${app.formatNumber(summary.total_value)} IDR</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load inventory summary:', error);
    }
};

// Change page
const changePage = (page) => {
    currentPage = page;
    loadInventory();
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
            loadInventory();
        });
    }
    
    // Low stock filter
    const lowStockCheckbox = document.getElementById('low-stock-filter');
    if (lowStockCheckbox) {
        lowStockCheckbox.addEventListener('change', () => {
            showLowStockOnly = lowStockCheckbox.checked;
            currentPage = 1; // Reset to first page when filtering
            loadInventory();
        });
    }
};

// Open stock in form
const openStockInForm = (materialId) => {
    const material = inventoryList.find(item => item.material_id == materialId);
    if (!material) return;
    
    const formHtml = `
        <form id="stock-in-form" class="form">
            <input type="hidden" id="stock-material-id" value="${material.material_id}">
            
            <div class="form-group">
                <label>Material: <strong>${material.material_name}</strong></label>
            </div>
            
            <div class="form-group">
                <label>Current Stock: <strong>${app.formatNumber(material.stock_quantity)} ${material.unit}</strong></label>
            </div>
            
            <div class="form-group">
                <label for="stock-in-quantity">Quantity to Add *</label>
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
            loadInventory(); // Reload the inventory list
        } catch (error) {
            console.error('Failed to add stock:', error);
        }
    });
};

// Open stock out form
const openStockOutForm = (materialId) => {
    const material = inventoryList.find(item => item.material_id == materialId);
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
            loadInventory(); // Reload the inventory list
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

// Generate inventory report
const generateInventoryReport = async (reportType) => {
    try {
        showLoader();
        
        let reportData;
        if (reportType === 'current') {
            reportData = await app.api.get('/backend/api/reports.php', { type: 'current_inventory' });
        } else if (reportType === 'transactions') {
            const startDate = document.getElementById('report-start-date').value;
            const endDate = document.getElementById('report-end-date').value;
            
            if (!startDate || !endDate) {
                app.showAlert('Please select both start and end dates', 'warning');
                hideLoader();
                return;
            }
            
            reportData = await app.api.get('/backend/api/reports.php', { 
                type: 'transactions', 
                start_date: startDate, 
                end_date: endDate 
            });
        }
        
        // Display the report in a new window or modal
        displayReport(reportData.data, reportType);
        
        hideLoader();
    } catch (error) {
        console.error('Failed to generate report:', error);
        app.showAlert('Failed to generate inventory report', 'danger');
        hideLoader();
    }
};

// Display report
const displayReport = (data, reportType) => {
    let reportContent;
    
    if (reportType === 'current') {
        // Current inventory report
        let tableRows = '';
        data.forEach(item => {
            const stockStatus = getStockStatus(item.quantity, item.min_stock_level);
            tableRows += `
                <tr>
                    <td>${item.material_name}</td>
                    <td>${item.category_name || 'Uncategorized'}</td>
                    <td>${item.quantity} ${item.unit}</td>
                    <td>${item.min_stock_level} ${item.unit}</td>
                    <td>${stockStatus.label}</td>
                </tr>
            `;
        });
        
        reportContent = `
            <h2>Current Inventory Report</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Minimum Level</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="report-actions">
                <button class="btn btn-primary" onclick="window.print()">Print Report</button>
            </div>
        `;
    } else if (reportType === 'transactions') {
        // Transactions report
        let tableRows = '';
        data.forEach(item => {
            tableRows += `
                <tr>
                    <td>${app.formatDate(item.transaction_date)}</td>
                    <td>${item.material_name}</td>
                    <td>${item.transaction_type === 'in' ? 'Stock In' : 'Stock Out'}</td>
                    <td>${item.quantity} ${item.unit}</td>
                    <td>${item.supplier_name || '-'}</td>
                    <td>${item.project_name || '-'}</td>
                    <td>${item.notes || '-'}</td>
                </tr>
            `;
        });
        
        reportContent = `
            <h2>Inventory Transactions Report</h2>
            <p>Period: ${document.getElementById('report-start-date').value} to ${document.getElementById('report-end-date').value}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Material</th>
                        <th>Transaction</th>
                        <th>Quantity</th>
                        <th>Supplier</th>
                        <th>Project</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div class="report-actions">
                <button class="btn btn-primary" onclick="window.print()">Print Report</button>
            </div>
        `;
    }
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inventory Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { color: #2c3e50; }
                .report-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .report-table th, .report-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                .report-table th { background-color: #2c3e50; color: white; }
                .report-actions { margin-top: 20px; }
                @media print {
                    .report-actions { display: none; }
                }
            </style>
        </head>
        <body>
            ${reportContent}
        </body>
        </html>
    `);
    reportWindow.document.close();
};

// Make functions available globally
window.initializeInventoryPage = initializeInventoryPage;
window.changePage = changePage;
window.openStockInForm = openStockInForm;
window.openStockOutForm = openStockOutForm;
window.generateInventoryReport = generateInventoryReport;
