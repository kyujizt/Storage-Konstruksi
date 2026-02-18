<?php
// backend/api/inventory_report.php
header('Content-Type: application/json');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    exit;
}

require_once '../config/database.php';

try {
    $conn = getConnection();
    
    // Get all materials with their inventory information
    $query = "SELECT m.material_id, m.material_name, m.category_name, 
              COALESCE(i.quantity, 0) as quantity, m.unit, m.min_stock_level
              FROM materials m
              LEFT JOIN inventory i ON m.material_id = i.material_id
              ORDER BY m.category_name, m.material_name";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'data' => $materials
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred'
    ]);
}
