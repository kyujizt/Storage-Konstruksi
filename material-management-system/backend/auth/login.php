<?php
// Start session
session_start();

// Include database connection
require_once '../config/database.php';

// Check if login form submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get username and password from form
    $username = $conn->real_escape_string($_POST['username']);
    $password = $_POST['password'];
    
    // Query to get user from database
    $sql = "SELECT * FROM users WHERE username = '$username'";
    $result = $conn->query($sql);
    
    if ($result->num_rows == 1) {
        $user = $result->fetch_assoc();
        
        // Debug information - print the hashed password for comparison
        error_log("Stored password hash: " . $user['password']);
        error_log("Login attempt for user: " . $username);
        
        // First try normal password_verify
        if (password_verify($password, $user['password'])) {
            // Set session variables
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role'] = $user['role'];
            
            // Return success
            header('Content-Type: application/json');
            echo json_encode(array('status' => 'success', 'message' => 'Login successful', 'redirect' => '/Project_PI_Konstruksi/material-management-system/pages/dashboard.html'));
        } 
        // Fallback for plain text passwords in development
        else if ($password === $user['password']) {
            // Set session variables
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role'] = $user['role'];
            
            // Return success
            header('Content-Type: application/json');
            echo json_encode(array('status' => 'success', 'message' => 'Login successful', 'redirect' => '/Project_PI_Konstruksi/material-management-system/pages/dashboard.html'));
        } else {
            // Return error
            header('Content-Type: application/json');
            echo json_encode(array('status' => 'error', 'message' => 'Invalid username or password'));
        }
    } else {
        // Return error
        header('Content-Type: application/json');
        echo json_encode(array('status' => 'error', 'message' => 'Invalid username or password'));
    }
    
    $conn->close();
} else {
    // Return error for invalid request method
    header('Content-Type: application/json');
    echo json_encode(array('status' => 'error', 'message' => 'Invalid request method'));
}
?>
