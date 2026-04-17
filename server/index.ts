import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import { db } from "./db/index.js";
import { users, sessions, messages } from "./db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting behind reverse proxy (like Cloud Run)
  app.set("trust proxy", 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // disabled for dev, configure properly in prod
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use("/api", limiter);

  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  const adminMiddleware = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) return res.status(400).json({ error: "User already exists" });

      const defaultRole = (email === process.env.SUPERADMIN_USERNAME) ? "superadmin" : "user";
      
      const passwordHash = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        name,
        role: defaultRole
      }).returning();

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.passwordHash) return res.status(400).json({ error: "Invalid credentials" });

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: any, res: any) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, preferences: user.preferences } });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Github OAuth Routes
  app.get('/api/auth/github/url', (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
    });
    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const redirectUri = `${process.env.APP_URL}/auth/github/callback`;
      // 1. Get access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description);

      const accessToken = tokenData.access_token;

      // 2. Get user info
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userRes.json();

      // 3. Get user email
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const emailData = await emailRes.json();
      const primaryEmail = emailData.find((e: any) => e.primary)?.email || emailData[0]?.email;

      if (!primaryEmail) throw new Error("No primary email found on Github account");

      // 4. Create or update user
      let [existingUser] = await db.select().from(users).where(eq(users.email, primaryEmail)).limit(1);

      if (!existingUser) {
        const defaultRole = (primaryEmail === process.env.SUPERADMIN_USERNAME) ? "superadmin" : "user";
        [existingUser] = await db.insert(users).values({
          email: primaryEmail,
          name: userData.name || userData.login,
          provider: "github",
          role: defaultRole
        }).returning();
      }

      // 5. Generate token (adjust cookie conf for iframe as per SDK guidelines)
      const token = jwt.sign({ id: existingUser.id, role: existingUser.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true, // required for SameSite=None
        sameSite: 'none', // required for cross-origin iframe in AI Studio
      });

      // 6. Return success HTML
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(400).send(`Authentication failed: ${error.message}`);
    }
  });

  // Google OAuth Routes
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const redirectUri = `${process.env.APP_URL}/auth/google/callback`;
      // 1. Get access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || "Token exchange failed");

      const accessToken = tokenData.access_token;

      // 2. Get user info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userRes.json();
      
      const primaryEmail = userData.email;
      if (!primaryEmail) throw new Error("No primary email found on Google account");

      // 3. Create or update user
      let [existingUser] = await db.select().from(users).where(eq(users.email, primaryEmail)).limit(1);

      if (!existingUser) {
        const defaultRole = (primaryEmail === process.env.SUPERADMIN_USERNAME) ? "superadmin" : "user";
        [existingUser] = await db.insert(users).values({
          email: primaryEmail,
          name: userData.name || "Google User",
          provider: "google",
          role: defaultRole
        }).returning();
      }

      // 4. Generate token
      const token = jwt.sign({ id: existingUser.id, role: existingUser.role }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true, // required for SameSite=None
        sameSite: 'none', // required for cross-origin iframe in AI Studio
      });

      // 5. Return success HTML
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(400).send(`Authentication failed: ${error.message}`);
    }
  });

  // Sessions API
  app.get("/api/sessions", authMiddleware, async (req: any, res: any) => {
    try {
      const allSessions = await db.select().from(sessions).where(eq(sessions.userId, req.user.id));
      const sessionsWithMessages = [];
      for (const session of allSessions) {
        const sessionMessages = await db.select().from(messages).where(eq(messages.sessionId, session.id)).orderBy(messages.timestamp);
        sessionsWithMessages.push({
          ...session,
          messages: sessionMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            timestamp: new Date(m.timestamp).getTime()
          })),
          createdAt: new Date(session.createdAt).getTime(),
          updatedAt: new Date(session.updatedAt).getTime()
        });
      }
      res.json(sessionsWithMessages.sort((a,b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/sessions", authMiddleware, async (req: any, res: any) => {
    try {
      const { id, topic, level, mode, language, roadmapItems, messages: msgs } = req.body;
      await db.insert(sessions).values({
        id,
        userId: req.user.id,
        topic,
        level,
        mode,
        language,
        roadmapItems
      });

      if (msgs && msgs.length > 0) {
        for (const m of msgs) {
          await db.insert(messages).values({
            id: m.id,
            sessionId: id,
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            timestamp: new Date(m.timestamp)
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/sessions/:id", authMiddleware, async (req: any, res: any) => {
    try {
      const { roadmapItems, messages: msgs } = req.body;
      const sessionId = req.params.id;
      
      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (!session || session.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

      await db.update(sessions).set({ roadmapItems, updatedAt: new Date() }).where(eq(sessions.id, sessionId));
      
      // Sync messages if provided
      if (msgs && msgs.length > 0) {
         // for simplicity, get existing message IDs
         const existingMsgs = await db.select({ id: messages.id }).from(messages).where(eq(messages.sessionId, sessionId));
         const existingIds = new Set(existingMsgs.map(m => m.id));

         for (const m of msgs) {
           if (!existingIds.has(m.id)) {
              await db.insert(messages).values({
                id: m.id,
                sessionId,
                role: m.role,
                content: m.content,
                attachments: m.attachments,
                timestamp: new Date(m.timestamp)
              });
           }
         }
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/sessions/:id", authMiddleware, async (req: any, res: any) => {
    try {
      const sessionId = req.params.id;
      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (!session || session.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

      await db.delete(sessions).where(eq(sessions.id, sessionId));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/sessions/:id/messages", authMiddleware, async (req: any, res: any) => {
    try {
      const sessionId = req.params.id;
      const { id, role, content, attachments, timestamp } = req.body;

      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (!session || session.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

      await db.insert(messages).values({
        id,
        sessionId,
        role,
        content,
        attachments,
        timestamp: new Date(timestamp)
      });
      await db.update(sessions).set({ updatedAt: new Date() }).where(eq(sessions.id, sessionId));

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/auth/profile", authMiddleware, async (req: any, res: any) => {
    try {
      const { name, preferences } = req.body;
      const [updatedUser] = await db.update(users)
        .set({ name, preferences })
        .where(eq(users.id, req.user.id))
        .returning();
      
      res.json({ 
        user: { 
          id: updatedUser.id, 
          name: updatedUser.name, 
          email: updatedUser.email, 
          role: updatedUser.role,
          preferences: updatedUser.preferences 
        } 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Basic API placeholders for Admin
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, preferences: users.preferences }).from(users);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { role } = req.body;
      const targetUserId = parseInt(req.params.id);
      await db.update(users).set({ role }).where(eq(users.id, targetUserId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: any, res: any) => {
    try {
      const targetUserId = parseInt(req.params.id);
      if (targetUserId === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
      await db.delete(users).where(eq(users.id, targetUserId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allSessions = await db.select().from(sessions);
      const allMessages = await db.select().from(messages);
      
      res.json({
        totalUsers: allUsers.length,
        totalSessions: allSessions.length,
        totalMessages: allMessages.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Add more session/messages routes here as needed...

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Seed superadmin
  try {
    const adminEmail = process.env.SUPERADMIN_USERNAME;
    const adminPassword = process.env.SUPERADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const existingAdminRes = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
      if (existingAdminRes.length === 0) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await db.insert(users).values({
          email: adminEmail,
          passwordHash,
          name: "Super Admin",
          role: "superadmin"
        });
        console.log("Superadmin seeded.");
      }
    }
  } catch (err) {
    console.error("Failed to seed superadmin:", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
