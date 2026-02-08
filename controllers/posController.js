import db from "../config/db.js";

/**
 * POST /pos/bills
 * Create a bill and update stock
 */
export const createBill = async (req, res) => {
    const { items, tax = 0, discount = 0, payment_method = "cash" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Items are required" });
    }

    for (const item of items) {
        if (!item?.product_id || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
            return res.status(400).json({ success: false, message: "Each item must have product_id and quantity" });
        }
    }

    const client = await db.pool.connect();

    try {
        await client.query("BEGIN");

        const productIds = items.map((item) => item.product_id);
        const productsResult = await client.query(
            `SELECT id, name, sku, price, stock_quantity
             FROM products
             WHERE shop_id = $1 AND id = ANY($2::int[])`,
            [req.user.shop_id, productIds]
        );

        if (productsResult.rows.length !== productIds.length) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "One or more products not found" });
        }

        const productMap = new Map(productsResult.rows.map((p) => [p.id, p]));
        let subtotal = 0;

        for (const item of items) {
            const product = productMap.get(item.product_id);
            const qty = Number(item.quantity);

            if (Number(product.stock_quantity) < qty) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            subtotal += Number(product.price) * qty;
        }

        const taxValue = Number(tax) || 0;
        const discountValue = Number(discount) || 0;
        const total = subtotal + taxValue - discountValue;

        const billResult = await client.query(
            `INSERT INTO bills (shop_id, user_id, subtotal, tax, discount, total, payment_method)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.user.shop_id, req.user.id, subtotal, taxValue, discountValue, total, payment_method]
        );

        const bill = billResult.rows[0];

        for (const item of items) {
            const product = productMap.get(item.product_id);
            const qty = Number(item.quantity);
            const unitPrice = Number(product.price);
            const lineTotal = unitPrice * qty;

            await client.query(
                `INSERT INTO bill_items
                (bill_id, product_id, product_name, sku, quantity, unit_price, line_total)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [bill.id, product.id, product.name, product.sku, qty, unitPrice, lineTotal]
            );

            await client.query(
                `UPDATE products
                 SET stock_quantity = stock_quantity - $1
                 WHERE id = $2 AND shop_id = $3`,
                [qty, product.id, req.user.shop_id]
            );

            await client.query(
                `INSERT INTO stock_movements
                (shop_id, product_id, quantity_change, reason, notes, user_id)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.user.shop_id, product.id, -qty, "POS Sale", null, req.user.id]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Bill created",
            bill
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create bill error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to create bill" });
    } finally {
        client.release();
    }
};

/**
 * GET /pos/bills
 * List bills
 */
export const getBills = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM bills WHERE shop_id = $1 ORDER BY created_at DESC`,
            [req.user.shop_id]
        );

        return res.status(200).json({ success: true, bills: result.rows });
    } catch (error) {
        console.error("Get bills error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to load bills" });
    }
};

/**
 * GET /pos/bills/:id
 * Get bill with items
 */
export const getBillById = async (req, res) => {
    const billId = req.params.id;

    try {
        const billResult = await db.query(
            `SELECT * FROM bills WHERE id = $1 AND shop_id = $2`,
            [billId, req.user.shop_id]
        );

        if (billResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Bill not found" });
        }

        const itemsResult = await db.query(
            `SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id ASC`,
            [billId]
        );

        return res.status(200).json({
            success: true,
            bill: billResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error("Get bill error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to load bill" });
    }
};
