import express from "express";
import { verifyToken } from "../middleware/isToken.js";
import { isStaff } from "../middleware/isAuthorized.js";
import { createBill, getBills, getBillById } from "../controllers/posController.js";

const router = express.Router();

router.use(verifyToken, isStaff);

// POST /pos/bills - Create bill (POS sale)
router.post("/bills", createBill);

// GET /pos/bills - List bills
router.get("/bills", getBills);

// GET /pos/bills/:id - Get bill with items
router.get("/bills/:id", getBillById);

export default router;
