import express from "express"
import {verifyToken} from "../middleware/isToken.js"
import {isOwner} from "../middleware/isAuthorized.js"
import {getTeam,inviteMember,removeMember,updateRole} from "../controllers/teamController.js"

const router=express.Router();
router.use(verifyToken,isOwner);
// GET /team - List team members
router.get('/', getTeam);

// POST /team/invite - Invite new member
router.post('/invite', inviteMember);

// PATCH /team/role/:id - Update member role (promote/demote)
router.patch('/role/:id', updateRole);

// DELETE /team/delete/:id - Remove member
router.delete('/delete/:id', removeMember);

export default router;

