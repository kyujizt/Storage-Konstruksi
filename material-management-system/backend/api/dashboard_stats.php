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

// Get dashboard stats
try {
    // Count total materials
    $sql = "SELECT COUNT(*) as total FROM materials";
    $result = $conn->query($sql);
    $totalMaterials = $result->fetch_assoc()['total'];
    
    // Count low stock materials
    $sql = "SELECT COUNT(*) as total FROM materials m 
            JOIN inventory i ON m.material_id = i.material_id 
            WHERE i.quantity > 0 AND i.quantity <= m.min_stock_level";
    $result = $conn->query($sql);
    $lowStock = $result->fetch_assoc()['total'];
    
    // Count out of stock materials
    $sql = "SELECT COUNT(*) as total FROM materials m 
            JOIN inventory i ON m.material_id = i.material_id 
            WHERE i.quantity <= 0";
    $result = $conn->query($sql);
    $outOfStock = $result->fetch_assoc()['total'];
    
    // Calculate total inventory value
    $sql = "SELECT SUM(t.unit_price * i.quantity) as total_value 
            FROM inventory i 
            JOIN materials m ON i.material_id = m.material_id
            LEFT JOIN (
                SELECT material_id, AVG(unit_price) as unit_price 
                FROM material_transactions 
                WHERE unit_price IS NOT NULL 
                GROUP BY material_id
            ) t ON i.material_id = t.material_id";
    $result = $conn->query($sql);
    $totalValue = $result->fetch_assoc()['total_value'];
    
    if ($totalValue === null) {
        $totalValue = 0;
    }
    
    // Return stats
    echo json_encode(array(
        'status' => 'success',
        'data' => array(
            'total_materials' => (int)$totalMaterials,
            'low_stock' => (int)$lowStock,
            'out_of_stock' => (int)$outOfStock,
            'total_value' => (float)$totalValue
        )
    ));
    
} catch (Exception $e) {
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
}

// Close database connection
$conn->close();
?>
