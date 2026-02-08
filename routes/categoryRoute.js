import express from 'express';
import {getCategories,createCategory,deleteCategory} from "../controllers/categoryController.js";
import {verifyToken} from "../middleware/isToken.js";
import {isOwner,isManager,isStaff} from "../middleware/isAuthorized.js";
const router = express.Router();

router.use(verifyToken)
// GET /categories - List all categories (all authenticated users)
router.get('/', isStaff,getCategories);

// POST /categories - Create new category (owners and managers only)
router.post('/', isManager, createCategory);

// DELETE /categories/:id - Delete category (owners and managers only)
router.delete('/:id',isManager, deleteCategory);

export default router;
