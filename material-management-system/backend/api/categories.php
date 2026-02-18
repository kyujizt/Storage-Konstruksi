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

// GET request - fetch categories
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get all material categories
        $sql = "SELECT * FROM material_categories ORDER BY category_name ASC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error executing query: " . $conn->error);
        }
        
        $categories = array();
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
        
        echo json_encode(array('status' => 'success', 'data' => $categories));
        
    } catch (Exception $e) {
        error_log($e->getMessage());
        echo json_encode(array('status' => 'error', 'message' => 'Failed to fetch categories'));
    }
} 
// POST request - add new category
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get input data
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['category_name']) || empty($data['category_name'])) {
            echo json_encode(array('status' => 'error', 'message' => 'Category name is required'));
            exit;
        }
        
        // Insert new category
        $categoryName = $conn->real_escape_string($data['category_name']);
        $description = isset($data['description']) ? $conn->real_escape_string($data['description']) : '';
        
        $sql = "INSERT INTO material_categories (category_name, description) VALUES ('$categoryName', '$description')";
        
        if ($conn->query($sql) === TRUE) {
            $newCategoryId = $conn->insert_id;
            echo json_encode(array(
                'status' => 'success', 
                'message' => 'Category added successfully',
                'data' => array(
                    'category_id' => $newCategoryId,
                    'category_name' => $data['category_name'],
                    'description' => $data['description'] ?? ''
                )
            ));
        } else {
            throw new Exception("Error: " . $sql . "<br>" . $conn->error);
        }
        
    } catch (Exception $e) {
        error_log($e->getMessage());
        echo json_encode(array('status' => 'error', 'message' => 'Failed to add category'));
    }
}
// PUT request - update category
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        // Get input data
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['category_id']) || empty($data['category_id'])) {
            echo json_encode(array('status' => 'error', 'message' => 'Category ID is required'));
            exit;
        }
        
        if (!isset($data['category_name']) || empty($data['category_name'])) {
            echo json_encode(array('status' => 'error', 'message' => 'Category name is required'));
            exit;
        }
        
        // Update category
        $categoryId = $conn->real_escape_string($data['category_id']);
        $categoryName = $conn->real_escape_string($data['category_name']);
        $description = isset($data['description']) ? $conn->real_escape_string($data['description']) : '';
        
        $sql = "UPDATE material_categories SET category_name = '$categoryName', description = '$description' 
                WHERE category_id = '$categoryId'";
        
        if ($conn->query($sql) === TRUE) {
            echo json_encode(array(
                'status' => 'success', 
                'message' => 'Category updated successfully',
                'data' => $data
            ));
        } else {
            throw new Exception("Error updating category: " . $conn->error);
        }
        
    } catch (Exception $e) {
        error_log($e->getMessage());
        echo json_encode(array('status' => 'error', 'message' => 'Failed to update category'));
    }
}
// DELETE request - delete category
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        // Check if category ID is provided
        if (!isset($_GET['id'])) {
            echo json_encode(array('status' => 'error', 'message' => 'Category ID is required'));
            exit;
        }
        
        $categoryId = $conn->real_escape_string($_GET['id']);
        
        // Check if any materials use this category
        $checkSql = "SELECT COUNT(*) AS count FROM materials WHERE category_id = '$categoryId'";
        $checkResult = $conn->query($checkSql);
        $row = $checkResult->fetch_assoc();
        
        if ($row['count'] > 0) {
            echo json_encode(array('status' => 'error', 'message' => 'Cannot delete category. It is being used by one or more materials.'));
            exit;
        }
        
        // Delete category
        $sql = "DELETE FROM material_categories WHERE category_id = '$categoryId'";
        
        if ($conn->query($sql) === TRUE) {
            echo json_encode(array('status' => 'success', 'message' => 'Category deleted successfully'));
        } else {
            throw new Exception("Error deleting category: " . $conn->error);
        }
        
    } catch (Exception $e) {
        error_log($e->getMessage());
        echo json_encode(array('status' => 'error', 'message' => 'Failed to delete category'));
    }
} else {
    // Invalid request method
    echo json_encode(array('status' => 'error', 'message' => 'Invalid request method'));
}
?>
