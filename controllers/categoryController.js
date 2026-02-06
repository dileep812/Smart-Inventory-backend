import db from "../config/db.js"

/**
 * GET /categories
 * List all categories for the shop
 */
export const getCategories = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM categories WHERE shop_id = $1 ORDER BY name ASC',
            [req.user.shop_id]
        );

        res.json({
            activePage: 'categories',
            categories: result.rows,
            shop:req.user.shop_id
        });

    } catch (error) {
    // 1. Log the error on the server for debugging
    console.error('Get categories error:', error.message);

    // 2. Return a JSON response with a 500 status
    return res.status(500).json({ 
        success: false, 
        message: 'Failed to load categories. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : {} 
    });
}
};


/**
 * POST /categories
 * Create a new category
 */
export const createCategory = async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
       return res.status(400).json({ 
            success: false, 
            message: 'Category name is required' 
        });
    }

    try {
            const result = await db.query(
            'INSERT INTO categories (shop_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.shop_id, name.trim()]
        );
        res.status(201).json({
            success:true,
            message:`the category ${name} is added`
        })

    } catch (error) {
        console.error('Create category error:', error.message);

        if (error.code === '23505') {
            return res.status(409).json({ 
                success: false, 
                message: 'A category with this name already exists' 
            });
        }

        // 4. General Server Error
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create category due to a server error' 
        });
    }
};

/**
 * DELETE /categories/:id
 * Delete a category (only if it belongs to the shop)
 */
export const deleteCategory = async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING id, name',
            [req.params.id, req.user.shop_id]
        );

       // 1. Check if anything was actually deleted
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
//deleted
        return res.status(200).json({
            success: true,
            message: `Category "${result.rows[0].name}" deleted successfully`,
            deletedId: result.rows[0].id // Useful for filtering the list in React
        });

    } catch (error) {
        console.error('Delete category error:', error.message);

        // 3. Server Error
        return res.status(500).json({
            success: false,
            message: 'Failed to delete category due to a server error'
        });
    }
};
