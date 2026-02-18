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

// Get low stock materials
try {
    // Get all materials that are low on stock or out of stock
    $sql = "SELECT m.material_id, m.material_name, m.description, m.unit, m.min_stock_level,
            mc.category_name, i.quantity
            FROM materials m
            LEFT JOIN material_categories mc ON m.category_id = mc.category_id
            JOIN inventory i ON m.material_id = i.material_id
            WHERE i.quantity <= m.min_stock_level
            ORDER BY 
                CASE 
                    WHEN i.quantity <= 0 THEN 1
                    WHEN i.quantity <= m.min_stock_level THEN 2
                    ELSE 3
                END,
                m.material_name
            LIMIT 10";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Error retrieving materials: " . $conn->error);
    }
    
    $materials = array();
    while ($row = $result->fetch_assoc()) {
        $materials[] = $row;
    }
    
    // Return materials
    echo json_encode(array(
        'status' => 'success',
        'data' => $materials
    ));
    
} catch (Exception $e) {
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
}

// Close database connection
$conn->close();
?>
