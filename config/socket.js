import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import db from "../config/db.js";

const parseCookie = (cookieHeader) => {
    if (!cookieHeader) return {};
    return cookieHeader.split(";").reduce((acc, part) => {
        const [key, ...val] = part.trim().split("=");
        acc[key] = decodeURIComponent(val.join("="));
        return acc;
    }, {});
};

export const setupSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_LINK?.trim() || "http://localhost:5173",
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            let decoded;

            if (token) {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } else {
                const cookies = parseCookie(socket.handshake.headers.cookie || "");
                const cookieToken = cookies.access_token;
                if (!cookieToken) {
                    return next(new Error("Unauthorized"));
                }
                decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
            }

            socket.user = decoded;
            return next();
        } catch (error) {
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        const { id: userId, shop_id: shopId } = socket.user;
        socket.join(`shop:${shopId}`);
        io.to(`shop:${shopId}`).emit("user:online", { user_id: userId });

        socket.on("chat:join", async ({ conversation_id }) => {
            if (!conversation_id) return;
            const result = await db.query(
                `SELECT 1 FROM conversation_members
                 WHERE conversation_id = $1 AND user_id = $2`,
                [conversation_id, userId]
            );
            if (result.rows.length === 0) return;
            socket.join(`conversation:${conversation_id}`);

            const undelivered = await db.query(
                `SELECT m.id
                 FROM messages m
                 WHERE m.conversation_id = $1
                   AND m.user_id <> $2
                   AND NOT EXISTS (
                      SELECT 1 FROM message_deliveries md
                      WHERE md.message_id = m.id AND md.user_id = $2
                   )`,
                [conversation_id, userId]
            );

            if (undelivered.rows.length > 0) {
                const values = undelivered.rows
                    .map((row, idx) => `($1, $${idx + 2})`)
                    .join(", ");
                const params = [userId, ...undelivered.rows.map((r) => r.id)];

                await db.query(
                    `INSERT INTO message_deliveries (user_id, message_id)
                     VALUES ${values}
                     ON CONFLICT DO NOTHING`,
                    params
                );

                socket.to(`conversation:${conversation_id}`).emit("chat:delivered", {
                    user_id: userId,
                    message_ids: undelivered.rows.map((r) => r.id)
                });
            }
        });

        socket.on("chat:typing", async ({ conversation_id }) => {
            if (!conversation_id) return;
            socket.to(`conversation:${conversation_id}`).emit("chat:typing", { user_id: userId });
        });

        socket.on("chat:stop_typing", async ({ conversation_id }) => {
            if (!conversation_id) return;
            socket.to(`conversation:${conversation_id}`).emit("chat:stop_typing", { user_id: userId });
        });

        socket.on("chat:message", async ({ conversation_id, body }) => {
            if (!conversation_id || !body || String(body).trim() === "") return;

            const memberCheck = await db.query(
                `SELECT 1 FROM conversation_members
                 WHERE conversation_id = $1 AND user_id = $2`,
                [conversation_id, userId]
            );
            if (memberCheck.rows.length === 0) return;

            const result = await db.query(
                `INSERT INTO messages (conversation_id, user_id, body)
                 VALUES ($1, $2, $3)
                 RETURNING id, conversation_id, user_id, body, created_at`,
                [conversation_id, userId, String(body).trim()]
            );

            const members = await db.query(
                `SELECT user_id FROM conversation_members
                 WHERE conversation_id = $1 AND user_id <> $2`,
                [conversation_id, userId]
            );

            if (members.rows.length > 0) {
                const values = members.rows
                    .map((row, idx) => `($1, $${idx + 2})`)
                    .join(", ");
                const params = [result.rows[0].id, ...members.rows.map((r) => r.user_id)];

                await db.query(
                    `INSERT INTO message_deliveries (message_id, user_id)
                     VALUES ${values}
                     ON CONFLICT DO NOTHING`,
                    params
                );
            }

            await db.query(
                `UPDATE conversations SET last_message_at = NOW()
                 WHERE id = $1 AND shop_id = $2`,
                [conversation_id, shopId]
            );

            await db.query(
                `UPDATE conversation_members
                 SET last_read_at = NOW()
                 WHERE conversation_id = $1 AND user_id = $2`,
                [conversation_id, userId]
            );

            io.to(`conversation:${conversation_id}`).emit("chat:message", result.rows[0]);
        });

        socket.on("chat:edit", async ({ message_id, body }) => {
            if (!message_id || !body || String(body).trim() === "") return;

            const updated = await db.query(
                `UPDATE messages
                 SET body = $1, edited_at = NOW()
                 WHERE id = $2 AND user_id = $3
                 RETURNING id, conversation_id, user_id, body, created_at, edited_at, deleted_at`,
                [String(body).trim(), message_id, userId]
            );

            if (updated.rows.length === 0) return;

            io.to(`conversation:${updated.rows[0].conversation_id}`).emit("chat:edit", updated.rows[0]);
        });

        socket.on("chat:delete", async ({ message_id }) => {
            if (!message_id) return;

            const updated = await db.query(
                `UPDATE messages
                 SET body = '', deleted_at = NOW()
                 WHERE id = $1 AND user_id = $2
                 RETURNING id, conversation_id, user_id, body, created_at, edited_at, deleted_at`,
                [message_id, userId]
            );

            if (updated.rows.length === 0) return;

            io.to(`conversation:${updated.rows[0].conversation_id}`).emit("chat:delete", updated.rows[0]);
        });

        socket.on("chat:read", async ({ conversation_id }) => {
            if (!conversation_id) return;
            await db.query(
                `UPDATE conversation_members
                 SET last_read_at = NOW()
                 WHERE conversation_id = $1 AND user_id = $2`,
                [conversation_id, userId]
            );

            io.to(`conversation:${conversation_id}`).emit("chat:read", { user_id: userId });
        });

        socket.on("disconnect", () => {
            io.to(`shop:${shopId}`).emit("user:offline", { user_id: userId });
        });
    });

    return io;
};
