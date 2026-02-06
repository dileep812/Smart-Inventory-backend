import db from '../config/db.js';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'Welcome123';

/**
 * GET /team
 * List all team members for the shop
 */
export const getTeam = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, role, created_at FROM users WHERE shop_id = $1 ORDER BY created_at DESC',
            [req.user.shop_id]
        );

        return res.status(200).json({
            success: true,
            team: result.rows,
            currentUserId: req.user.id
        });
    } catch (error) {
        console.error('Get team error:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to load team members' 
        });
    }
};

/**
 * POST /team/invite
 * Invite a new team member
 */
export const inviteMember = async (req, res) => {
    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    if (!['manager', 'staff'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    try {
        // Check if email already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'This email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        const result = await db.query(
            `INSERT INTO users (shop_id, email, password_hash, role) 
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, created_at`,
            [req.user.shop_id, email.toLowerCase().trim(), hashedPassword, role]
        );

        return res.status(201).json({
            success: true,
            message: `Member invited! Default password is ${DEFAULT_PASSWORD}`,
            newMember: result.rows[0]
        });
    } catch (error) {
        console.error('Invite member error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to invite member' });
    }
};

/**
 * DELETE /team/:id
 * Remove a team member
 */
export const removeMember = async (req, res) => {
    const memberId = parseInt(req.params.id);

    if (memberId === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot remove yourself' });
    }

    try {
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 AND shop_id = $2 AND role != $3 RETURNING id, email',
            [memberId, req.user.shop_id, 'owner']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        return res.status(200).json({
            success: true,
            message: `${result.rows[0]} removed from team`,
            deletedId: memberId
        });
    } catch (error) {
        console.error('Remove member error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
};

/**
 * PATCH /team/role/:id
 * Update role
 */
export const updateRole = async (req, res) => {
    const memberId = parseInt(req.params.id);
    const { newRole } = req.body;

    if (!['manager', 'staff'].includes(newRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role. Must be manager or staff' });
    }

    if (memberId === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    try {
        const result = await db.query(
            `UPDATE users 
             SET role = $1 
             WHERE id = $2 AND shop_id = $3 AND role != 'owner'
             RETURNING id, email, role`,
            [newRole, memberId, req.user.shop_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Member not found or cannot be updated' });
        }

        return res.status(200).json({
            success: true,
            message: `Role updated to ${newRole}`,
            updatedMember: result.rows[0]
        });
    } catch (error) {
        console.error('Update role error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update member role' });
    }
};