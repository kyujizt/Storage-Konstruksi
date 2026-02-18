<?php
$servername = "localhost";
$username = "root";
$password = ""; 
$dbname = "material_db";

// Create mysqli connection
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode(array('status' => 'error', 'message' => "Connection failed: " . $conn->connect_error)));
}

$conn->set_charset("utf8");

// Function for getting PDO connection
function getConnection() {
    global $servername, $username, $password, $dbname;
    
    try {
        $dsn = "mysql:host=$servername;dbname=$dbname;charset=utf8";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        return new PDO($dsn, $username, $password, $options);
    } catch (PDOException $e) {
        error_log("Database Connection Error: " . $e->getMessage());
        header('Content-Type: application/json');
        die(json_encode(array('status' => 'error', 'message' => "Database connection failed")));
    }
}
?>
