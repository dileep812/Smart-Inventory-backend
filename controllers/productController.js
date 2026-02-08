import db from "../config/db.js";

/**
 * GET /products
 * List all products for the shop
 */
export const getProducts = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.shop_id = $1 
             ORDER BY p.created_at DESC`,
            [req.user.shop_id]
        );

        return res.status(200).json({
            success: true,
            products: result.rows
        });
    } catch (error) {
        console.error("Get products error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to load products" 
        });
    }
};

/**
 * POST /products
 * Create a new product (with optional category)
 */
export const createProduct = async (req, res) => {
    const {
        name,
        price,
        stock_quantity = 0,
        sku,
        description,
        image_url,
        category_id
    } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({ success: false, message: "Product name is required" });
    }

    if (price === undefined || price === null || Number.isNaN(Number(price))) {
        return res.status(400).json({ success: false, message: "Valid price is required" });
    }

    const finalImageUrl = req.file?.path || image_url || null;

    try {
        // If category_id is provided, ensure it belongs to the same shop
        if (category_id) {
            const catCheck = await db.query(
                "SELECT id FROM categories WHERE id = $1 AND shop_id = $2",
                [category_id, req.user.shop_id]
            );

            if (catCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: "Invalid category for this shop" });
            }
        }

        const result = await db.query(
            `INSERT INTO products 
            (shop_id, category_id, name, sku, stock_quantity, price, description, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                req.user.shop_id,
                category_id || null,
                name.trim(),
                sku || null,
                Number(stock_quantity) || 0,
                Number(price),
                description || null,
                finalImageUrl
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Product created",
            product: result.rows[0]
        });
    } catch (error) {
        console.error("Create product error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "SKU already exists in this shop" });
        }

        return res.status(500).json({ success: false, message: "Failed to create product" });
    }
};
export const updateProduct = async (req, res) => {
    const productId = req.params.id;

    const {
        name,
        price,
        stock_quantity,
        sku,
        description,
        image_url,
        category_id
    } = req.body;

    try {
        const existing = await db.query(
            "SELECT id FROM products WHERE id = $1 AND shop_id = $2",
            [productId, req.user.shop_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (category_id !== undefined) {
            if (category_id !== null) {
                const catCheck = await db.query(
                    "SELECT id FROM categories WHERE id = $1 AND shop_id = $2",
                    [category_id, req.user.shop_id]
                );
                if (catCheck.rows.length === 0) {
                    return res.status(400).json({ success: false, message: "Invalid category for this shop" });
                }
            }
        }

        const finalImageUrl = req.file?.path ?? image_url;

        const fields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name?.trim()); }
        if (price !== undefined) { fields.push(`price = $${idx++}`); values.push(Number(price)); }
        if (stock_quantity !== undefined) { fields.push(`stock_quantity = $${idx++}`); values.push(Number(stock_quantity)); }
        if (sku !== undefined) { fields.push(`sku = $${idx++}`); values.push(sku); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (finalImageUrl !== undefined) { fields.push(`image_url = $${idx++}`); values.push(finalImageUrl); }
        if (category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(category_id); }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: "No fields to update" });
        }

        values.push(productId, req.user.shop_id);

        const result = await db.query(
            `UPDATE products SET ${fields.join(", ")}
             WHERE id = $${idx++} AND shop_id = $${idx}
             RETURNING *`,
            values
        );

        return res.status(200).json({
            success: true,
            message: "Product updated",
            product: result.rows[0]
        });
    } catch (error) {
        console.error("Update product error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "SKU already exists in this shop" });
        }

        return res.status(500).json({ success: false, message: "Failed to update product" });
    }
};
/**
 * DELETE /products/:id
 * Delete a product
 */
export const deleteProduct = async (req, res) => {
    const productId = req.params.id;

    try {
        const result = await db.query(
            "DELETE FROM products WHERE id = $1 AND shop_id = $2 RETURNING id, name",
            [productId, req.user.shop_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Product "${result.rows[0].name}" deleted`,
            deletedId: result.rows[0].id
        });
    } catch (error) {
        console.error("Delete product error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to delete product" });
    }
};