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

// Get recent transactions
try {
    // Get last 10 transactions
    $sql = "SELECT t.transaction_id, t.transaction_date, t.transaction_type, t.quantity, 
            m.material_name, m.unit, 
            s.name as supplier_name, p.project_name 
            FROM material_transactions t
            JOIN materials m ON t.material_id = m.material_id
            LEFT JOIN suppliers s ON t.supplier_id = s.supplier_id
            LEFT JOIN projects p ON t.project_id = p.project_id
            ORDER BY t.transaction_date DESC
            LIMIT 10";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Error retrieving transactions: " . $conn->error);
    }
    
    $transactions = array();
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    
    // Return transactions
    echo json_encode(array(
        'status' => 'success',
        'data' => $transactions
    ));
    
} catch (Exception $e) {
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
}

// Close database connection
$conn->close();
?>
