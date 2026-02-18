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

// GET request - fetch materials
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = getConnection();
        
        // Check if specific ID is provided
        if (isset($_GET['id'])) {
            $materialId = $_GET['id'];
            $sql = "SELECT m.*, i.quantity as stock_quantity 
                    FROM materials m 
                    LEFT JOIN inventory i ON m.material_id = i.material_id
                    WHERE m.material_id = :material_id";
            
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':material_id', $materialId, PDO::PARAM_INT);
            $stmt->execute();
            
            $material = $stmt->fetch();
            
            if ($material) {
                echo json_encode(array('status' => 'success', 'data' => $material));
            } else {
                echo json_encode(array('status' => 'error', 'message' => 'Material not found'));
            }
        } else {
            // Get all materials with pagination
            $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
            $offset = ($page - 1) * $limit;
            
            // Prepare base query and conditions
            $conditions = [];
            $params = [];
            
            // Filter by category if provided
            if (isset($_GET['category_id']) && $_GET['category_id'] > 0) {
                $conditions[] = "m.category_id = :category_id";
                $params[':category_id'] = $_GET['category_id'];
            }
            
            // Search term
            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $conditions[] = "(m.material_name LIKE :search OR m.description LIKE :search)";
                $params[':search'] = "%" . $_GET['search'] . "%";
            }
            
            // Build WHERE clause
            $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
            
            // Prepare the main query
            $sql = "SELECT m.*, i.quantity as stock_quantity 
                    FROM materials m 
                    LEFT JOIN inventory i ON m.material_id = i.material_id
                    $whereClause
                    ORDER BY m.material_name 
                    LIMIT :offset, :limit";
            
            // Prepare count query for pagination
            $countSql = "SELECT COUNT(*) as total FROM materials m $whereClause";
            
            // Execute count query
            $countStmt = $conn->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $totalCount = $countStmt->fetchColumn();
            
            // Execute main query
            $stmt = $conn->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            // Fetch results
            $materials = $stmt->fetchAll();
            
            echo json_encode(array(
                'status' => 'success', 
            'data' => $materials,
            'pagination' => array(
                'page' => $page,
                'limit' => $limit,
                'total' => intval($totalCount),
                'pages' => ceil($totalCount / $limit)
            )
        ));
    }
}

// POST request - create new material
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if user has permission
    if (!checkRole(array('admin', 'manager'))) {
        echo json_encode(array('status' => 'error', 'message' => 'Permission denied'));
        exit;
    }
    
    // Get data from request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['material_name']) || empty($data['material_name']) || !isset($data['unit']) || empty($data['unit'])) {
        echo json_encode(array('status' => 'error', 'message' => 'Material name and unit are required'));
        exit;
    }
    
    $materialName = $conn->real_escape_string($data['material_name']);
    $description = $conn->real_escape_string($data['description'] ?? '');
    $unit = $conn->real_escape_string($data['unit']);
    $categoryId = isset($data['category_id']) ? intval($data['category_id']) : null;
    $minStockLevel = isset($data['min_stock_level']) ? floatval($data['min_stock_level']) : 0;
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Insert into materials table
        $sql = "INSERT INTO materials (material_name, description, unit, category_id, min_stock_level) 
                VALUES ('$materialName', '$description', '$unit', " . ($categoryId ? $categoryId : "NULL") . ", $minStockLevel)";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error inserting material: " . $conn->error);
        }
        
        $materialId = $conn->insert_id;
        
        // Insert initial inventory record
        $initialQuantity = isset($data['initial_quantity']) ? floatval($data['initial_quantity']) : 0;
        
        $sql = "INSERT INTO inventory (material_id, quantity) VALUES ($materialId, $initialQuantity)";
        
        if ($conn->query($sql) !== TRUE) {
            throw new Exception("Error inserting inventory: " . $conn->error);
        }
        
        // If initial quantity > 0, add transaction record
        if ($initialQuantity > 0) {
            $userId = $_SESSION['user_id'];
            $sql = "INSERT INTO material_transactions (material_id, quantity, transaction_type, recorded_by, notes) 
                    VALUES ($materialId, $initialQuantity, 'in', $userId, 'Initial stock')";
                    
            if ($conn->query($sql) !== TRUE) {
                throw new Exception("Error inserting transaction: " . $conn->error);
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode(array('status' => 'success', 'message' => 'Material added successfully', 'material_id' => $materialId));
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
    }
}

// PUT request - update material
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Check if user has permission
    if (!checkRole(array('admin', 'manager'))) {
        echo json_encode(array('status' => 'error', 'message' => 'Permission denied'));
        exit;
    }
    
    // Get data from request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['material_id']) || empty($data['material_id'])) {
        echo json_encode(array('status' => 'error', 'message' => 'Material ID is required'));
        exit;
    }
    
    $materialId = intval($data['material_id']);
    $updateFields = array();
    
    if (isset($data['material_name']) && !empty($data['material_name'])) {
        $materialName = $conn->real_escape_string($data['material_name']);
        $updateFields[] = "material_name = '$materialName'";
    }
    
    if (isset($data['description'])) {
        $description = $conn->real_escape_string($data['description']);
        $updateFields[] = "description = '$description'";
    }
    
    if (isset($data['unit']) && !empty($data['unit'])) {
        $unit = $conn->real_escape_string($data['unit']);
        $updateFields[] = "unit = '$unit'";
    }
    
    if (isset($data['category_id'])) {
        $categoryId = intval($data['category_id']);
        $updateFields[] = "category_id = " . ($categoryId > 0 ? $categoryId : "NULL");
    }
    
    if (isset($data['min_stock_level'])) {
        $minStockLevel = floatval($data['min_stock_level']);
        $updateFields[] = "min_stock_level = $minStockLevel";
    }
    
    if (empty($updateFields)) {
        echo json_encode(array('status' => 'error', 'message' => 'No fields to update'));
        exit;
    }
    
    // Update material
    $sql = "UPDATE materials SET " . implode(', ', $updateFields) . " WHERE material_id = $materialId";
    
    if ($conn->query($sql) === TRUE) {
        echo json_encode(array('status' => 'success', 'message' => 'Material updated successfully'));
    } else {
        echo json_encode(array('status' => 'error', 'message' => 'Error updating material: ' . $conn->error));
    }
}

// DELETE request - delete material
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Check if user has permission
    if (!checkRole(array('admin'))) {
        echo json_encode(array('status' => 'error', 'message' => 'Permission denied'));
        exit;
    }
    
    // Get material ID from URL
    $materialId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($materialId <= 0) {
        echo json_encode(array('status' => 'error', 'message' => 'Invalid material ID'));
        exit;
    }
    
    // Check if material exists
    $sql = "SELECT material_id FROM materials WHERE material_id = $materialId";
    $result = $conn->query($sql);
    
    if ($result->num_rows === 0) {
        echo json_encode(array('status' => 'error', 'message' => 'Material not found'));
        exit;
    }
    
    // Delete material (inventory and transactions will be deleted due to foreign key constraints with CASCADE)
    $sql = "DELETE FROM materials WHERE material_id = $materialId";
    
    if ($conn->query($sql) === TRUE) {
        echo json_encode(array('status' => 'success', 'message' => 'Material deleted successfully'));
    } else {
        echo json_encode(array('status' => 'error', 'message' => 'Error deleting material: ' . $conn->error));
    }
}

// Other request methods
else {
    echo json_encode(array('status' => 'error', 'message' => 'Invalid request method'));
}

// Close database connection
$conn->close();
?>
