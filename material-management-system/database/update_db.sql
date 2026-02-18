-- Script to update material_db database
USE material_db;

-- Check if material_categories table exists, if not create it
CREATE TABLE IF NOT EXISTS material_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Insert some default categories if table was just created
INSERT IGNORE INTO material_categories (category_id, category_name) VALUES 
(1, 'Cement'),
(2, 'Steel'),
(3, 'Bricks'),
(4, 'Sand'),
(5, 'Aggregate'),
(6, 'Wood'),
(7, 'Paint'),
(8, 'Electrical'),
(9, 'Plumbing'),
(10, 'Other');

-- Check if materials table exists and add category_name column if not exists
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS category_name VARCHAR(50) AFTER category_id;

-- Update materials to include category_name from material_categories
UPDATE materials m 
JOIN material_categories c ON m.category_id = c.category_id
SET m.category_name = c.category_name
WHERE m.category_name IS NULL OR m.category_name = '';
