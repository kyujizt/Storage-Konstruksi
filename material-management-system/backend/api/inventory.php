<?php
// Include session and database
require_once '../auth/session.php';
require_once '../config/database.php';

// Set content type to JSON
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    echo json_encode(array('status' => 'error', 'message' => 'User not logged in'));
    exit;
}

// GET request - fetch inventory
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all inventory with pagination
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $offset = ($page - 1) * $limit;
    
    // Filter by low stock if requested
    $lowStockFilter = "";
    if (isset($_GET['low_stock']) && $_GET['low_stock'] === '1') {
        $lowStockFilter = "HAVING stock_level <= 0 OR stock_quantity <= m.min_stock_level";
    }
    
    // Search term
    $searchFilter = "";
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $search = $conn->real_escape_string($_GET['search']);
        $searchFilter = "AND (m.material_name LIKE '%$search%' OR m.description LIKE '%$search%')";
    }
    
    $sql = "SELECT m.material_id, m.material_name, m.description, m.unit, m.min_stock_level,
            mc.category_id, mc.category_name, i.quantity as stock_quantity,
            CASE 
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                WHEN i.quantity <= m.min_stock_level THEN 'low_stock'
                ELSE 'in_stock'
            END as stock_level
            FROM materials m
            LEFT JOIN material_categories mc ON m.category_id = mc.category_id
            LEFT JOIN inventory i ON m.material_id = i.material_id
            WHERE 1=1 $searchFilter
            $lowStockFilter
            ORDER BY 
                CASE 
                    WHEN i.quantity <= 0 THEN 1
                    WHEN i.quantity <= m.min_stock_level THEN 2
                    ELSE 3
                END,
                m.material_name
            LIMIT $offset, $limit";
    
    $countSql = "SELECT COUNT(*) as total 
                FROM materials m
                LEFT JOIN inventory i ON m.material_id = i.material_id
                WHERE 1=1 $searchFilter";
                
    if (!empty($lowStockFilter)) {
        $countSql = "SELECT COUNT(*) as total FROM ($sql) as subquery";
    }
    
    $result = $conn->query($sql);
    
    if (!$result) {
        echo json_encode(array('status' => 'error', 'message' => 'Error fetching inventory: ' . $conn->error));
        exit;
    }
    
    $countResult = $conn->query($countSql);
    $totalCount = $countResult->fetch_assoc()['total'];
    
    $inventory = array();
    while ($row = $result->fetch_assoc()) {
        $inventory[] = $row;
    }
    
    echo json_encode(array(
        'status' => 'success', 
        'data' => $inventory,
        'pagination' => array(
            'page' => $page,
            'limit' => $limit,
            'total' => intval($totalCount),
            'pages' => ceil($totalCount / $limit)
        )
    ));
}

// POST request - update inventory (stock in)
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if user has permission
    if (!checkRole(array('admin', 'manager', 'staff'))) {
        echo json_encode(array('status' => 'error', 'message' => 'Permission denied'));
        exit;
    }
    
    // Get data from request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['material_id']) || !isset($data['quantity']) || floatval($data['quantity']) <= 0) {
        echo json_encode(array('status' => 'error', 'message' => 'Material ID and positive quantity are required'));
        exit;
    }
    
    $materialId = intval($data['material_id']);
    $quantity = floatval($data['quantity']);
    $supplierId = isset($data['supplier_id']) ? intval($data['supplier_id']) : null;
    $unitPrice = isset($data['unit_price']) ? floatval($data['unit_price']) : null;
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $userId = $_SESSION['user_id'];
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Update inventory
        $sql = "UPDATE inventory SET quantity = quantity + $quantity WHERE material_id = $materialId";
        
        if ($conn->query($sql) !== TRUE) {
            // If no row was updated, insert a new row
            if ($conn->affected_rows === 0) {
                $sql = "INSERT INTO inventory (material_id, quantity) VALUES ($materialId, $quantity)";
                
                if ($conn->query($sql) !== TRUE) {
                    throw new Exception("Error updating inventory: " . $conn->error);
                }
            } else {
                throw new Exception("Error updating inventory: " . $conn->error);
            }
        }
        
        // Add transaction record
        $sql = "INSERT INTO material_transactions (material_id, quantity, transaction_type, supplier_id, unit_price, recorded_by, notes) 
                VALUES ($materialId, $quantity, 'in', " . 
                ($supplierId ? "$supplierId" : "NULL") . ", " .
                ($unitPrice ? "$unitPrice" : "NULL") . ", $userId, '$notes')";
                
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error recording transaction: " . $conn->error);
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode(array('status' => 'success', 'message' => 'Stock updated successfully'));
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
    }
}

// PUT request - stock out
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Check if user has permission
    if (!checkRole(array('admin', 'manager', 'staff'))) {
        echo json_encode(array('status' => 'error', 'message' => 'Permission denied'));
        exit;
    }
    
    // Get data from request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['material_id']) || !isset($data['quantity']) || floatval($data['quantity']) <= 0) {
        echo json_encode(array('status' => 'error', 'message' => 'Material ID and positive quantity are required'));
        exit;
    }
    
    $materialId = intval($data['material_id']);
    $quantity = floatval($data['quantity']);
    $projectId = isset($data['project_id']) ? intval($data['project_id']) : null;
    $notes = $conn->real_escape_string($data['notes'] ?? '');
    $userId = $_SESSION['user_id'];
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Check if there is enough stock
        $sql = "SELECT quantity FROM inventory WHERE material_id = $materialId";
        $result = $conn->query($sql);
        
        if ($result->num_rows === 0) {
            throw new Exception("Material not found in inventory");
        }
        
        $currentStock = $result->fetch_assoc()['quantity'];
        
        if ($currentStock < $quantity) {
            throw new Exception("Not enough stock. Current stock: $currentStock");
        }
        
        // Update inventory
        $sql = "UPDATE inventory SET quantity = quantity - $quantity WHERE material_id = $materialId";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error updating inventory: " . $conn->error);
        }
        
        // Add transaction record
        $sql = "INSERT INTO material_transactions (material_id, project_id, quantity, transaction_type, recorded_by, notes) 
                VALUES ($materialId, " . ($projectId ? "$projectId" : "NULL") . ", $quantity, 'out', $userId, '$notes')";
                
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error recording transaction: " . $conn->error);
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode(array('status' => 'success', 'message' => 'Stock updated successfully'));
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
    }
}

// Other request methods
else {
    echo json_encode(array('status' => 'error', 'message' => 'Invalid request method'));
}

// Close database connection
$conn->close();
?>
