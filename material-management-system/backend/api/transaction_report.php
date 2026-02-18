<?php
// backend/api/transaction_report.php
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
    
    // Validate and sanitize input dates
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');
    
    // Validate date format
    $startDateTime = DateTime::createFromFormat('Y-m-d', $startDate);
    $endDateTime = DateTime::createFromFormat('Y-m-d', $endDate);
    
    if (!$startDateTime || !$endDateTime) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid date format']);
        exit;
    }
    
    // Adjust end date to include the entire day
    $endDate = date('Y-m-d', strtotime($endDate . ' +1 day'));
    
    // Get transactions within the date range
    $query = "SELECT t.transaction_id, t.transaction_date, t.transaction_type, 
              t.quantity, m.material_name, m.unit, t.supplier_name, 
              t.project_name, t.notes
              FROM transactions t
              JOIN materials m ON t.material_id = m.material_id
              WHERE t.transaction_date >= :startDate AND t.transaction_date < :endDate
              ORDER BY t.transaction_date DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':startDate', $startDate);
    $stmt->bindParam(':endDate', $endDate);
    $stmt->execute();
    
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'data' => $transactions
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
