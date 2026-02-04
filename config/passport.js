import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

import bcrypt from 'bcrypt';
import db from './db.js';


const SALT_ROUNDS = 10;
/**
 * Configure Passport.js with Local and Google OAuth Strategies
 */

// =============================================
// Local Strategy (Email/Password Login)
// =============================================
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // Required to access req.body.shopName
    },
    async (req, email, password, done) => {
        const client = await db.pool.connect();
        const normalizedEmail = email.toLowerCase().trim();
        const { shopName } = req.body; 

        try {
            // 1. Check if user exists
            const userResult = await client.query(
                `SELECT users.*, shops.name as shop_name 
                 FROM users 
                 LEFT JOIN shops ON users.shop_id = shops.id 
                 WHERE users.email = $1`,
                [normalizedEmail]
            );

            let user = userResult.rows[0];

            if (user) {
                // CASE: Login existing user
                if (!user.password_hash) {
                    return done(null, false, { message: 'This email is linked to Google. Please use Google Login.' });
                }

                const isMatch = await bcrypt.compare(password, user.password_hash);
                if (!isMatch) {
                    return done(null, false, { message: 'Invalid credentials.' });
                }

                console.log(`✓ Existing user logged in: ${user.email}`);
                return done(null, user);

            } else {
                // CASE: Signup new user
                await client.query('BEGIN');

                // Step 1: Create the Shop
                const finalShopName = shopName || `${normalizedEmail.split('@')[0]}'s Shop`;
                const shopResult = await client.query(
                    'INSERT INTO shops (name) VALUES ($1) RETURNING id, name',
                    [finalShopName]
                );
                const newShop = shopResult.rows[0];

                // Step 2: Hash password and create User
                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

                const newUserResult = await client.query(
                    `INSERT INTO users (email, password_hash, shop_id, role) 
                     VALUES ($1, $2, $3, 'owner') 
                     RETURNING *`,
                    [normalizedEmail, hashedPassword, newShop.id]
                );

                await client.query('COMMIT');

                user = newUserResult.rows[0];
                user.shop_name = newShop.name; // Attach for logging/JWT

                console.log(`✓ New user created and logged in: ${user.email}`);
                return done(null, user);
            }

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Auth Strategy Error:', error.message);
            return done(error);
        } finally {
            client.release();
        }
    }
));

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        req => req.cookies?.access_token   // read JWT from cookie
      ]),
      secretOrKey: process.env.JWT_SECRET
    },
    async (payload, done) => {
      try {
        // payload = what you signed in JWT
        return done(null, payload); // attaches to req.user
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;