<?php
// Start session
session_start();

// Check if user is logged in
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    // Return error
    header('Content-Type: application/json');
    echo json_encode(array('status' => 'error', 'message' => 'User not logged in', 'redirect' => '../login.html'));
    exit;
}

// Function to check if user has required role
function checkRole($requiredRoles = array('admin', 'manager', 'staff')) {
    // If no role is required, return true
    if (empty($requiredRoles)) {
        return true;
    }
    
    // If user role is in required roles, return true
    if (in_array($_SESSION['role'], $requiredRoles)) {
        return true;
    }
    
    // Return false if user does not have required role
    return false;
}

// Get current user info
function getCurrentUser() {
    return array(
        'user_id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'full_name' => $_SESSION['full_name'],
        'role' => $_SESSION['role']
    );
}
?>
