<?php
// Start session
session_start();

// Set content type to JSON
header('Content-Type: application/json');

// Check if user is logged in
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    // User is logged in, return success
    echo json_encode(array(
        'status' => 'success',
        'message' => 'User is authenticated',
        'user' => array(
            'username' => $_SESSION['username'],
            'fullName' => $_SESSION['full_name'],
            'role' => $_SESSION['role']
        )
    ));
} else {
    // User is not logged in, return error
    echo json_encode(array(
        'status' => 'error',
        'message' => 'User is not authenticated'
    ));
}
?>
