<?php
// Start session
session_start();

// Unset all session variables
$_SESSION = array();

// Destroy the session
session_destroy();

// Return success
header('Content-Type: application/json');
echo json_encode(array('status' => 'success', 'message' => 'Logout successful', 'redirect' => '../login.html'));
?>
