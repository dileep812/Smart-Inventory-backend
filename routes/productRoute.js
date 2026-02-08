import express from "express";
import { verifyToken } from "../middleware/isToken.js";
import { isManager, isStaff } from "../middleware/isAuthorized.js";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import upload from "../middleware/upload.js";
const router=express.Router();

// GET /products - List all products (all authenticated users)
router.get("/", verifyToken, isStaff, getProducts);

// POST /products - Create product (manager/owner)
router.post("/", verifyToken, isManager, upload.single("image"), createProduct);

// PATCH /products/:id - Update product (manager/owner)
router.patch("/:id", verifyToken, isManager, upload.single("image"), updateProduct);

// DELETE /products/:id - Delete product (manager/owner)
router.delete("/:id", verifyToken, isManager, deleteProduct);

export default router;