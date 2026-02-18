<?php
// Include database connection
require_once 'backend/config/database.php';

// Check if connection successful
echo "Database connection status: ";
if ($conn->connect_error) {
    echo "Failed - " . $conn->connect_error;
} else {
    echo "Success";
}

echo "<br><br>";

// Check if users table exists and has data
echo "Users in database:<br>";
$sql = "SELECT user_id, username, password, role FROM users";
$result = $conn->query($sql);

if (!$result) {
    echo "Error querying users table: " . $conn->error;
} else {
    if ($result->num_rows > 0) {
        echo "<table border='1'>";
        echo "<tr><th>ID</th><th>Username</th><th>Password (hashed)</th><th>Role</th></tr>";
        
        while($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . $row["user_id"] . "</td>";
            echo "<td>" . $row["username"] . "</td>";
            echo "<td>" . $row["password"] . "</td>";
            echo "<td>" . $row["role"] . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "No users found in the database!";
    }
}

$conn->close();
?>
