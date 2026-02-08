import express from "express";
import { verifyToken } from "../middleware/isToken.js";
import { isManager, isStaff } from "../middleware/isAuthorized.js";
import { getProducts, createProduct, updateProduct, deleteProduct, adjustStock } from "../controllers/productController.js";
import upload from "../middleware/upload.js";
const router=express.Router();

router.use(verifyToken)
// GET /products - List all products (all authenticated users)
router.get("/",  isStaff, getProducts);

// POST /products - Create product (manager/owner)
router.post("/",  isManager, upload.single("image"), createProduct);

// PATCH /products/:id - Update product (manager/owner)
router.patch("/:id",  isManager, upload.single("image"), updateProduct);

// POST /products/:id/adjust - Adjust stock (all authenticated users)
router.post("/:id/adjust",  isStaff, adjustStock);

// DELETE /products/:id - Delete product (manager/owner)
router.delete("/:id", isManager, deleteProduct);

export default router;