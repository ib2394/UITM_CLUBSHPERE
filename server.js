const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

const dbConfig = {
    user: "club_user",
    password: "club123",
    connectString: "localhost:1521/FREEPDB1"
};

// Logging middleware for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

/* --- SECTION 1: IMPROVED AUTHENTICATION --- */
app.post('/api/login', async (req, res) => {
    let connection;
    try {
        const { user_email, user_password, user_type } = req.body;

        // Input validation
        if (!user_email || !user_password || !user_type) {
            return res.status(400).json({
                message: "Missing required fields: email, password, or user type"
            });
        }

        // Log attempt (without password for security)
        console.log('Login attempt:', {
            email: user_email,
            type: user_type
        });

        connection = await oracledb.getConnection(dbConfig);

        // Case-insensitive email search with explicit column ordering
        const sql = `
            SELECT USER_ID, USER_NAME, USER_TYPE, USER_EMAIL, USER_PASSWORD
            FROM USERS
            WHERE LOWER(USER_EMAIL) = LOWER(:email)
                AND USER_TYPE = :type
                AND IS_ACTIVE = 1
        `;

        const binds = {
            email: user_email.trim(),
            type: user_type
        };

        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (result.rows.length === 0) {
            console.log('Login failed: No user found with email and type');
            return res.status(401).json({
                message: "Invalid email or user type"
            });
        }

        const user = result.rows[0];

        // Verify password
        if (user.USER_PASSWORD !== user_password) {
            console.log('Login failed: Incorrect password');
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        console.log('Login successful:', user.USER_EMAIL);

        // Return user data
        res.status(200).json({
            user: {
                id: user.USER_ID,
                name: user.USER_NAME,
                type: user.USER_TYPE,
                email: user.USER_EMAIL
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            message: "Server error during login",
            error: err.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

app.post('/api/register', async (req, res) => {
    let connection;
    try {
        const {
            user_name,
            user_email,
            user_password,
            user_type,
            student_number,
            student_program,
            student_faculty,
            student_semester
        } = req.body;

        // Validation
        if (!user_name || !user_email || !user_password) {
            return res.status(400).json({
                message: "Name, email, and password are required"
            });
        }

        if (!student_number || !student_program || !student_faculty || !student_semester) {
            return res.status(400).json({
                message: "All student information fields are required"
            });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Check if email already exists
        const checkEmail = await connection.execute(
            `SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email)`,
            [user_email.trim()],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (checkEmail.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Check if student number already exists
        const checkStudent = await connection.execute(
            `SELECT USER_ID FROM STUDENT_INFO WHERE STUDENT_NUMBER = :snum`,
            [student_number],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (checkStudent.rows.length > 0) {
            return res.status(409).json({
                message: "Student number already registered"
            });
        }

        // Insert user
        const userSql = `
            INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
            VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, :type) 
            RETURNING USER_ID INTO :id
        `;

        const userResult = await connection.execute(
            userSql,
            {
                name: user_name.trim(),
                pass: user_password,
                email: user_email.trim().toLowerCase(),
                type: user_type || 'student',
                id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }
        );

        const newUserId = userResult.outBinds.id[0];

        // Insert student info
        await connection.execute(
            `INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) 
             VALUES (:id, :sNum, :prog, :fac, :sem)`,
            {
                id: newUserId,
                sNum: student_number,
                prog: student_program,
                fac: student_faculty,
                sem: student_semester
            }
        );

        await connection.commit();

        console.log('Registration successful:', user_email);
        res.status(201).json({
            message: "Registration successful",
            userId: newUserId
        });

    } catch (err) {
        console.error('Registration error:', err);

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Rollback error:', rollbackErr);
            }
        }

        res.status(500).json({
            message: "Server error during registration",
            error: err.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

/* --- SECTION 2: STUDENT DASHBOARD & PROFILE --- */
app.get('/api/profile/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT u.USER_NAME, u.USER_EMAIL, si.STUDENT_NUMBER, 
                   si.STUDENT_FACULTY, si.STUDENT_PROGRAM, si.STUDENT_SEMESTER
            FROM USERS u 
            JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID 
            WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
        `;

        const result = await connection.execute(sql, [req.params.email], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ message: "Error fetching profile" });
    } finally {
        if (connection) await connection.close();
    }
});

app.put('/api/profile/update', async (req, res) => {
    let connection;
    try {
        const { email, name, student_number, faculty, program, semester } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Update user name
        await connection.execute(
            `UPDATE USERS SET USER_NAME = :name WHERE LOWER(USER_EMAIL) = LOWER(:email)`,
            { name, email }
        );

        // Update student info
        await connection.execute(
            `UPDATE STUDENT_INFO si 
             SET si.STUDENT_NUMBER = :sNum, 
                 si.STUDENT_FACULTY = :fac, 
                 si.STUDENT_PROGRAM = :prog, 
                 si.STUDENT_SEMESTER = :sem
             WHERE si.USER_ID = (SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email))`,
            { sNum: student_number, fac: faculty, prog: program, sem: semester, email }
        );

        await connection.commit();
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error('Profile update error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error updating profile" });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/student/stats/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM USERS_CLUB uc 
                 JOIN USERS u ON uc.USER_ID = u.USER_ID 
                 WHERE LOWER(u.USER_EMAIL) = LOWER(:email)) as JOINED,
                (SELECT COUNT(*) FROM APPLICATION a 
                 JOIN USERS u ON a.USER_ID = u.USER_ID 
                 WHERE LOWER(u.USER_EMAIL) = LOWER(:email)) as APPS,
                (SELECT COUNT(*) FROM EVENTS e 
                 JOIN USERS_CLUB uc ON e.CLUB_ID = uc.CLUB_ID 
                 JOIN USERS u ON uc.USER_ID = u.USER_ID 
                 WHERE LOWER(u.USER_EMAIL) = LOWER(:email) 
                 AND e.EVENT_DATETIME > SYSDATE) as EVENTS 
            FROM DUAL
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(result.rows[0] || { JOINED: 0, APPS: 0, EVENTS: 0 });
    } catch (err) {
        console.error('Stats fetch error:', err);
        res.status(500).json({ message: "Error fetching statistics" });
    } finally {
        if (connection) await connection.close();
    }
});

/* --- SECTION 3: CLUBS & APPLICATIONS --- */
// Get announcements with filter support (all public OR my clubs only)
app.get('/api/student/announcements/:email', async (req, res) => {
    let connection;
    try {
        const filter = req.query.filter || 'all'; // 'all' or 'my-clubs'
        connection = await oracledb.getConnection(dbConfig);

        let sql;
        if (filter === 'my-clubs') {
            // Only announcements from clubs the student joined
            sql = `
                SELECT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, 
                       a.ANNC_DATE, c.CLUB_NAME 
                FROM ANNOUNCEMENT a 
                JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID 
                JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID
                JOIN USERS u ON uc.USER_ID = u.USER_ID
                WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
                ORDER BY a.ANNC_DATE DESC 
                FETCH FIRST 20 ROWS ONLY
            `;
        } else {
            // All public announcements + private ones from joined clubs
            sql = `
                SELECT DISTINCT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, 
                       a.ANNC_DATE, c.CLUB_NAME,
                       CASE 
                           WHEN uc.USER_ID IS NOT NULL THEN 'My Club'
                           ELSE 'Public'
                       END as SOURCE
                FROM ANNOUNCEMENT a 
                JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID 
                LEFT JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID 
                    AND uc.USER_ID = (SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email))
                WHERE a.ANNC_TYPE = 'Public'
                   OR (a.ANNC_TYPE = 'Private' AND uc.USER_ID IS NOT NULL)
                ORDER BY a.ANNC_DATE DESC 
                FETCH FIRST 20 ROWS ONLY
            `;
        }

        const result = await connection.execute(
            sql,
            { email: req.params.email },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Announcements fetch error:', err);
        res.status(500).json({ message: "Error fetching announcements" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get events with filter support (all public OR my clubs only)
app.get('/api/student/events/:email', async (req, res) => {
    let connection;
    try {
        const filter = req.query.filter || 'all'; // 'all' or 'my-clubs'
        connection = await oracledb.getConnection(dbConfig);

        let sql;
        if (filter === 'my-clubs') {
            // Only events from clubs the student joined
            sql = `
                SELECT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, 
                       e.EVENT_DATETIME, c.CLUB_NAME 
                FROM EVENTS e 
                JOIN CLUBS c ON e.CLUB_ID = c.CLUB_ID 
                JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID
                JOIN USERS u ON uc.USER_ID = u.USER_ID
                WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
                  AND e.EVENT_DATETIME > SYSDATE
                ORDER BY e.EVENT_DATETIME ASC 
                FETCH FIRST 20 ROWS ONLY
            `;
        } else {
            // All public events + private ones from joined clubs
            sql = `
                SELECT DISTINCT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, 
                       e.EVENT_DATETIME, c.CLUB_NAME,
                       CASE 
                           WHEN uc.USER_ID IS NOT NULL THEN 'My Club'
                           ELSE 'Public'
                       END as SOURCE
                FROM EVENTS e 
                JOIN CLUBS c ON e.CLUB_ID = c.CLUB_ID 
                LEFT JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID 
                    AND uc.USER_ID = (SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email))
                WHERE (e.EVENT_TYPE = 'Public' OR (e.EVENT_TYPE = 'Private' AND uc.USER_ID IS NOT NULL))
                  AND e.EVENT_DATETIME > SYSDATE
                ORDER BY e.EVENT_DATETIME ASC 
                FETCH FIRST 20 ROWS ONLY
            `;
        }

        const result = await connection.execute(
            sql,
            { email: req.params.email },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Events fetch error:', err);
        res.status(500).json({ message: "Error fetching events" });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/student/clubs', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT c.CLUB_ID, c.CLUB_NAME, c.ADVISOR_NAME, cat.CATEGORY_NAME 
             FROM CLUBS c 
             LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID 
             LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Clubs fetch error:', err);
        res.status(500).json({ message: "Error fetching clubs" });
    } finally {
        if (connection) await connection.close();
    }
});

// New endpoint: Get detailed club information
app.get('/api/clubs/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Get club details with category
        const clubSql = `
            SELECT c.CLUB_ID, c.CLUB_NAME, c.CLUB_MISSION, c.CLUB_VISION, 
                   c.CLUB_EMAIL, c.CLUB_PHONE, c.ADVISOR_NAME, 
                   c.ADVISOR_EMAIL, c.ADVISOR_PHONE, cat.CATEGORY_NAME,
                   (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT
            FROM CLUBS c 
            LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID 
            LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID
            WHERE c.CLUB_ID = :id
        `;

        const clubResult = await connection.execute(
            clubSql,
            { id: req.params.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (clubResult.rows.length === 0) {
            return res.status(404).json({ message: "Club not found" });
        }

        const club = clubResult.rows[0];

        // Get upcoming events for this club (only public ones for non-members)
        const eventsSql = `
            SELECT EVENT_ID, EVENT_NAME, EVENT_DESC, EVENT_TYPE, EVENT_DATETIME
            FROM EVENTS
            WHERE CLUB_ID = :id 
              AND EVENT_TYPE = 'Public'
              AND EVENT_DATETIME > SYSDATE
            ORDER BY EVENT_DATETIME ASC
            FETCH FIRST 5 ROWS ONLY
        `;

        const eventsResult = await connection.execute(
            eventsSql,
            { id: req.params.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Combine club details with events
        const response = {
            ...club,
            EVENTS: eventsResult.rows
        };

        res.json(response);
    } catch (err) {
        console.error('Club details fetch error:', err);
        res.status(500).json({ message: "Error fetching club details" });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/student/applications/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT a.APPLICATION_ID, c.CLUB_NAME, a.APPLICATION_STATUS, SYSDATE as APP_DATE 
             FROM APPLICATION a 
             JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID 
             JOIN USERS u ON a.USER_ID = u.USER_ID 
             WHERE LOWER(u.USER_EMAIL) = LOWER(:email)`,
            [req.params.email],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Applications fetch error:', err);
        res.status(500).json({ message: "Error fetching applications" });
    } finally {
        if (connection) await connection.close();
    }
});

app.post('/api/student/apply', async (req, res) => {
    let connection;
    try {
        const { user_email, club_id } = req.body;

        // Log the incoming request
        console.log('Apply request received:', { user_email, club_id });

        if (!user_email || !club_id) {
            console.log('Missing required fields');
            return res.status(400).json({ message: "Email and club ID are required" });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connection established');

        // Get user ID
        const userRes = await connection.execute(
            `SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email)`,
            { email: user_email },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('User lookup result:', userRes.rows);

        if (userRes.rows.length === 0) {
            console.log('User not found:', user_email);
            return res.status(404).json({ message: "User not found" });
        }

        const userId = userRes.rows[0].USER_ID;
        console.log('Found user ID:', userId);

        // Verify club exists
        const clubRes = await connection.execute(
            `SELECT CLUB_ID FROM CLUBS WHERE CLUB_ID = :clubid`,
            { clubid: club_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (clubRes.rows.length === 0) {
            console.log('Club not found:', club_id);
            return res.status(404).json({ message: "Club not found" });
        }

        console.log('Club verified:', club_id);

        // Check if already a member
        const memberCheck = await connection.execute(
            `SELECT USER_CLUB_ID FROM USERS_CLUB 
             WHERE USER_ID = :userid AND CLUB_ID = :clubid`,
            { userid: userId, clubid: club_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (memberCheck.rows.length > 0) {
            console.log('User is already a member');
            return res.status(409).json({ message: "You are already a member of this club" });
        }

        // Check if already applied
        const existingApp = await connection.execute(
            `SELECT APPLICATION_ID, APPLICATION_STATUS FROM APPLICATION 
             WHERE USER_ID = :userid AND CLUB_ID = :clubid`,
            { userid: userId, clubid: club_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existingApp.rows.length > 0) {
            const status = existingApp.rows[0].APPLICATION_STATUS;
            console.log('Existing application found with status:', status);
            return res.status(409).json({
                message: `You already have a ${status.toLowerCase()} application for this club`
            });
        }

        console.log('Creating new application...');

        // Create application with proper bind variables
        const result = await connection.execute(
            `INSERT INTO APPLICATION (APPLICATION_ID, APPLICATION_STATUS, USER_ID, CLUB_ID) 
             VALUES (application_seq.NEXTVAL, 'Pending', :userid, :clubid)
             RETURNING APPLICATION_ID INTO :appid`,
            {
                userid: userId,
                clubid: club_id,
                appid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }
        );

        const newAppId = result.outBinds.appid[0];
        console.log('Application created with ID:', newAppId);

        await connection.commit();
        console.log('Application committed successfully');

        res.status(201).json({
            message: "Application submitted successfully",
            applicationId: newAppId
        });
    } catch (err) {
        console.error('Application error details:', {
            message: err.message,
            code: err.errorNum,
            offset: err.offset,
            stack: err.stack
        });

        if (connection) {
            try {
                await connection.rollback();
                console.log('Transaction rolled back');
            } catch (rollbackErr) {
                console.error('Rollback error:', rollbackErr);
            }
        }

        res.status(500).json({
            message: "Error submitting application",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Connection closed');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

app.delete('/api/student/application/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `DELETE FROM APPLICATION WHERE APPLICATION_ID = :id`,
            [req.params.id]
        );

        await connection.commit();
        res.json({ message: "Application cancelled successfully" });
    } catch (err) {
        console.error('Application delete error:', err);
        res.status(500).json({ message: "Error cancelling application" });
    } finally {
        if (connection) await connection.close();
    }
});

/* --- SECTION 4: ADMIN API --- */
app.get('/api/categories', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT CATEGORY_ID, CATEGORY_NAME FROM CATEGORY`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Categories fetch error:', err);
        res.status(500).json({ message: "Error fetching categories" });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/admin/clubs', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT c.CLUB_ID, c.CLUB_NAME, c.ADVISOR_NAME, c.CLUB_EMAIL, 
                   cat.CATEGORY_NAME, 
                   (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT 
            FROM CLUBS c 
            LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID 
            LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID
        `;

        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error('Admin clubs fetch error:', err);
        res.status(500).json({ message: "Error fetching clubs" });
    } finally {
        if (connection) await connection.close();
    }
});

app.post('/api/admin/clubs', async (req, res) => {
    let connection;

    try {
        const {
            club_name,
            club_mission,
            club_vision,
            club_email,
            club_phone,
            advisor_name,
            advisor_email,
            advisor_phone,
            category_id,
            admin_name,
            admin_email,
            admin_password
        } = req.body;

        connection = await oracledb.getConnection(dbConfig);

        /* ===============================
           1. CREATE CLUB
        =============================== */
        const clubResult = await connection.execute(
            `
      INSERT INTO CLUBS (
        CLUB_ID,
        CLUB_NAME,
        CLUB_MISSION,
        CLUB_VISION,
        CLUB_EMAIL,
        CLUB_PHONE,
        ADVISOR_NAME,
        ADVISOR_EMAIL,
        ADVISOR_PHONE
      ) VALUES (
        club_seq.NEXTVAL,
        :club_name,
        :club_mission,
        :club_vision,
        :club_email,
        :club_phone,
        :advisor_name,
        :advisor_email,
        :advisor_phone
      )
      RETURNING CLUB_ID INTO :club_id
      `,
            {
                club_name,
                club_mission,
                club_vision,
                club_email,
                club_phone,
                advisor_name,
                advisor_email,
                advisor_phone,
                club_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
        );

        const clubId = clubResult.outBinds.club_id[0];

        /* ===============================
           2. MAP CLUB → CATEGORY
        =============================== */
        await connection.execute(
            `
      INSERT INTO CLUB_CATEGORY (
        CLUB_CAT_ID,
        CLUB_ID,
        CATEGORY_ID
      ) VALUES (
        club_cat_seq.NEXTVAL,
        :club_id,
        :category_id
      )
      `,
            {
                club_id: clubId,
                category_id
            }
        );

        /* ===============================
           3. CREATE CLUB ADMIN USER
        =============================== */
        const userResult = await connection.execute(
            `
      INSERT INTO USERS (
        USER_ID,
        USER_NAME,
        USER_PASSWORD,
        USER_EMAIL,
        IS_ACTIVE,
        USER_TYPE
      ) VALUES (
        user_seq.NEXTVAL,
        :user_name,
        :user_password,
        :user_email,
        1,
        'club_admin'
      )
      RETURNING USER_ID INTO :user_id
      `,
            {
                user_name: admin_name,
                user_password: admin_password,
                user_email: admin_email,
                user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
        );

        const userId = userResult.outBinds.user_id[0];

        /* ===============================
           4. LINK USER ↔ CLUB
        =============================== */
        /* ===============================
   4. LINK USER ↔ CLUB
=============================== */
        await connection.execute(
            `
            INSERT INTO USERS_CLUB (
                USER_CLUB_ID,
                USER_ID,
                CLUB_ID
            ) VALUES (
                user_club_seq.NEXTVAL,
                :user_id,
                :club_id
            )
            `,
            {
                user_id: userId,
                club_id: clubId
            }
        );

        /* ===============================
           5. COMMIT
        =============================== */
        await connection.commit();

        res.status(201).json({
            message: 'Club created and club admin account assigned successfully',
            club_id: clubId,
            admin_user_id: userId
        });

    } catch (err) {
        console.error('Club creation error:', err);

        if (connection) {
            try {
                await connection.rollback();
            } catch (e) {
                console.error('Rollback failed:', e);
            }
        }

        res.status(500).json({
            error: 'Failed to create club',
            details: err.message
        });

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error('Connection close failed:', e);
            }
        }
    }
});


app.delete('/api/admin/clubs/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const id = req.params.id;

        // Delete in order to avoid constraint errors
        await connection.execute(`DELETE FROM CLUB_CATEGORY WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS_CLUB WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM APPLICATION WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM ANNOUNCEMENT WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM EVENTS WHERE CLUB_ID = :id`, [id]);
        await connection.execute(`DELETE FROM CLUBS WHERE CLUB_ID = :id`, [id]);

        await connection.commit();
        res.json({ message: "Club deleted successfully" });
    } catch (err) {
        console.error('Club deletion error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error deleting club" });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/admin/students', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT u.USER_ID, u.USER_NAME, si.STUDENT_NUMBER, 
                   si.STUDENT_FACULTY, si.STUDENT_PROGRAM, 
                   (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.USER_ID = u.USER_ID) as CLUBS_JOINED 
            FROM USERS u 
            JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID 
            WHERE u.USER_TYPE = 'student'
        `;

        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error('Students fetch error:', err);
        res.status(500).json({ message: "Error fetching students" });
    } finally {
        if (connection) await connection.close();
    }
});

app.delete('/api/admin/students/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const id = req.params.id;

        await connection.execute(`DELETE FROM APPLICATION WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS_CLUB WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM STUDENT_INFO WHERE USER_ID = :id`, [id]);
        await connection.execute(`DELETE FROM USERS WHERE USER_ID = :id`, [id]);

        await connection.commit();
        res.json({ message: "Student deleted successfully" });
    } catch (err) {
        console.error('Student deletion error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error deleting student" });
    } finally {
        if (connection) await connection.close();
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbConfig.connectString}`);
});

/* --- SECTION 5: CLUB ADMIN API (Using USERS_CLUB) --- */

// Get club admin dashboard stats
app.get('/api/club-admin/stats/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Get club ID for this admin from USERS_CLUB table
        const clubIdSql = `
            SELECT uc.CLUB_ID
            FROM USERS_CLUB uc
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
              AND u.USER_TYPE = 'club_admin'
        `;

        const clubIdResult = await connection.execute(clubIdSql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (clubIdResult.rows.length === 0) {
            return res.status(404).json({ message: "Club not found for this admin" });
        }

        const clubId = clubIdResult.rows[0].CLUB_ID;

        // Get stats (exclude club_admin from member count)
        const statsSql = `
            SELECT 
                (SELECT COUNT(*) FROM USERS_CLUB uc 
                 JOIN USERS u ON uc.USER_ID = u.USER_ID 
                 WHERE uc.CLUB_ID = :cid AND u.USER_TYPE = 'student') as MEMBERS,
                (SELECT COUNT(*) FROM APPLICATION WHERE CLUB_ID = :cid AND APPLICATION_STATUS = 'Pending') as PENDING_APPS,
                (SELECT COUNT(*) FROM EVENTS WHERE CLUB_ID = :cid AND EVENT_DATETIME > SYSDATE) as UPCOMING_EVENTS
            FROM DUAL
        `;

        const statsResult = await connection.execute(statsSql, { cid: clubId }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(statsResult.rows[0] || { MEMBERS: 0, PENDING_APPS: 0, UPCOMING_EVENTS: 0 });
    } catch (err) {
        console.error('Club admin stats error:', err);
        res.status(500).json({ message: "Error fetching statistics" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get club profile
app.get('/api/club-admin/profile/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT c.CLUB_ID, c.CLUB_NAME, c.CLUB_MISSION, c.CLUB_VISION,
                   c.CLUB_EMAIL, c.CLUB_PHONE, c.ADVISOR_NAME, 
                   c.ADVISOR_EMAIL, c.ADVISOR_PHONE
            FROM CLUBS c
            JOIN USERS_CLUB uc ON c.CLUB_ID = uc.CLUB_ID
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
              AND u.USER_TYPE = 'club_admin'
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Club profile not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Club profile fetch error:', err);
        res.status(500).json({ message: "Error fetching club profile" });
    } finally {
        if (connection) await connection.close();
    }
});

// Update club profile
app.put('/api/club-admin/profile', async (req, res) => {
    let connection;
    try {
        const { email, mission, vision, club_email, club_phone } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            UPDATE CLUBS c
            SET c.CLUB_MISSION = :mission,
                c.CLUB_VISION = :vision,
                c.CLUB_EMAIL = :cemail,
                c.CLUB_PHONE = :cphone
            WHERE c.CLUB_ID = (
                SELECT uc.CLUB_ID
                FROM USERS_CLUB uc
                JOIN USERS u ON uc.USER_ID = u.USER_ID
                WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
                  AND u.USER_TYPE = 'club_admin'
            )
        `;

        await connection.execute(sql, {
            mission, vision,
            cemail: club_email,
            cphone: club_phone,
            email
        });

        await connection.commit();
        res.json({ message: "Club profile updated successfully" });
    } catch (err) {
        console.error('Club profile update error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error updating club profile" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get announcements for club
app.get('/api/club-admin/announcements/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT a.ANNC_ID, a.ANNC_TITLE, a.ANNC_CONTENT, a.ANNC_TYPE, a.ANNC_DATE
            FROM ANNOUNCEMENT a
            WHERE a.CLUB_ID = (
                SELECT uc.CLUB_ID
                FROM USERS_CLUB uc
                JOIN USERS u ON uc.USER_ID = u.USER_ID
                WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
                  AND u.USER_TYPE = 'club_admin'
            )
            ORDER BY a.ANNC_DATE DESC
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Announcements fetch error:', err);
        res.status(500).json({ message: "Error fetching announcements" });
    } finally {
        if (connection) await connection.close();
    }
});

// Add announcement
app.post('/api/club-admin/announcements', async (req, res) => {
    let connection;
    try {
        const { email, title, content, type } = req.body;

        if (!email || !title || !content || !type) {
            return res.status(400).json({ message: "All fields are required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Get club ID
        const clubIdSql = `
            SELECT uc.CLUB_ID
            FROM USERS_CLUB uc
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
              AND u.USER_TYPE = 'club_admin'
        `;

        const clubIdResult = await connection.execute(clubIdSql, { email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (clubIdResult.rows.length === 0) {
            return res.status(404).json({ message: "Club not found" });
        }

        const clubId = clubIdResult.rows[0].CLUB_ID;

        // Insert announcement
        const insertSql = `
            INSERT INTO ANNOUNCEMENT (ANNC_ID, ANNC_TITLE, ANNC_CONTENT, ANNC_TYPE, ANNC_DATE, CLUB_ID)
            VALUES (announcement_seq.NEXTVAL, :title, :content, :type, SYSDATE, :clubId)
            RETURNING ANNC_ID INTO :id
        `;

        const result = await connection.execute(insertSql, {
            title, content, type, clubId,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });

        await connection.commit();

        res.status(201).json({
            message: "Announcement created successfully",
            announcementId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Announcement creation error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error creating announcement" });
    } finally {
        if (connection) await connection.close();
    }
});

// Delete announcement
app.delete('/api/club-admin/announcements/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `DELETE FROM ANNOUNCEMENT WHERE ANNC_ID = :id`,
            [req.params.id]
        );

        await connection.commit();
        res.json({ message: "Announcement deleted successfully" });
    } catch (err) {
        console.error('Announcement deletion error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error deleting announcement" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get events for club
app.get('/api/club-admin/events/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT e.EVENT_ID, e.EVENT_NAME, e.EVENT_DESC, e.EVENT_TYPE, 
                   e.EVENT_DATETIME
            FROM EVENTS e
            WHERE e.CLUB_ID = (
                SELECT uc.CLUB_ID
                FROM USERS_CLUB uc
                JOIN USERS u ON uc.USER_ID = u.USER_ID
                WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
                  AND u.USER_TYPE = 'club_admin'
            )
            ORDER BY e.EVENT_DATETIME DESC
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Events fetch error:', err);
        res.status(500).json({ message: "Error fetching events" });
    } finally {
        if (connection) await connection.close();
    }
});

// Add event

app.post('/api/club-admin/events', async (req, res) => {
    let connection;
    try {
        const { email, name, description, type, datetime } = req.body;

        if (!email || !name || !description || !type || !datetime) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Get club ID
        const clubIdSql = `
            SELECT uc.CLUB_ID
            FROM USERS_CLUB uc
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE LOWER(u.USER_EMAIL) = LOWER(:adminEmail)
              AND u.USER_TYPE = 'club_admin'
        `;

        const clubIdResult = await connection.execute(clubIdSql, { adminEmail: email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
        );

        if (clubIdResult.rows.length === 0) {
            return res.status(404).json({ message: "Club not found" });
        }

        const clubId = clubIdResult.rows[0].CLUB_ID;

        // Insert event - Use non-reserved keywords for bind variables
        const insertSql = `
            INSERT INTO EVENTS (EVENT_ID, EVENT_NAME, EVENT_DESC, EVENT_TYPE, EVENT_DATETIME, CLUB_ID)
            VALUES (event_seq.NEXTVAL, :eventName, :eventDesc, :eventType, TO_DATE(:eventDateTime, 'YYYY-MM-DD"T"HH24:MI:SS'), :clubId)
            RETURNING EVENT_ID INTO :newEventId
        `;

        const result = await connection.execute(insertSql, {
            eventName: name,
            eventDesc: description,
            eventType: type,
            eventDateTime: datetime,
            clubId: clubId,
            newEventId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });

        await connection.commit();

        res.status(201).json({
            message: "Event created successfully",
            eventId: result.outBinds.newEventId[0]
        });
    } catch (err) {
        console.error('Event creation error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error creating event", error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Delete event
app.delete('/api/club-admin/events/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `DELETE FROM EVENTS WHERE EVENT_ID = :id`,
            [req.params.id]
        );

        await connection.commit();
        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        console.error('Event deletion error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error deleting event" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get club members (only students, not club_admin)
app.get('/api/club-admin/members/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT u.USER_ID, u.USER_NAME, u.USER_EMAIL,
                   si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM
            FROM USERS_CLUB uc
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID
            WHERE uc.CLUB_ID = (
                SELECT uc2.CLUB_ID
                FROM USERS_CLUB uc2
                JOIN USERS u2 ON uc2.USER_ID = u2.USER_ID
                WHERE LOWER(u2.USER_EMAIL) = LOWER(:email)
                  AND u2.USER_TYPE = 'club_admin'
            )
            AND u.USER_TYPE = 'student'
            ORDER BY u.USER_NAME
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Members fetch error:', err);
        res.status(500).json({ message: "Error fetching members" });
    } finally {
        if (connection) await connection.close();
    }
});

// Remove member
app.delete('/api/club-admin/members/:userId', async (req, res) => {
    let connection;
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Get club ID
        const clubIdSql = `
            SELECT uc.CLUB_ID
            FROM USERS_CLUB uc
            JOIN USERS u ON uc.USER_ID = u.USER_ID
            WHERE LOWER(u.USER_EMAIL) = LOWER(:email)
              AND u.USER_TYPE = 'club_admin'
        `;

        const clubIdResult = await connection.execute(clubIdSql, { email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        if (clubIdResult.rows.length === 0) {
            return res.status(404).json({ message: "Club not found" });
        }

        const clubId = clubIdResult.rows[0].CLUB_ID;

        // Remove member
        await connection.execute(
            `DELETE FROM USERS_CLUB WHERE USER_ID = :uid AND CLUB_ID = :cid`,
            { uid: req.params.userId, cid: clubId }
        );

        await connection.commit();
        res.json({ message: "Member removed successfully" });
    } catch (err) {
        console.error('Member removal error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error removing member" });
    } finally {
        if (connection) await connection.close();
    }
});

// Get pending applicants
app.get('/api/club-admin/applicants/:email', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            SELECT a.APPLICATION_ID, a.APPLICATION_STATUS,
                   u.USER_ID, u.USER_NAME, u.USER_EMAIL,
                   si.STUDENT_NUMBER, si.STUDENT_FACULTY, si.STUDENT_PROGRAM
            FROM APPLICATION a
            JOIN USERS u ON a.USER_ID = u.USER_ID
            JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID
            WHERE a.CLUB_ID = (
                SELECT uc.CLUB_ID
                FROM USERS_CLUB uc
                JOIN USERS u2 ON uc.USER_ID = u2.USER_ID
                WHERE LOWER(u2.USER_EMAIL) = LOWER(:email)
                  AND u2.USER_TYPE = 'club_admin'
            )
            AND a.APPLICATION_STATUS = 'Pending'
            ORDER BY a.APPLICATION_ID DESC
        `;

        const result = await connection.execute(sql, { email: req.params.email }, {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Applicants fetch error:', err);
        res.status(500).json({ message: "Error fetching applicants" });
    } finally {
        if (connection) await connection.close();
    }
});

// Approve applicant
app.put('/api/club-admin/applicants/:id/approve', async (req, res) => {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const applicationId = req.params.id;

        // 1. Get the application details
        const appResult = await connection.execute(
            `SELECT USER_ID, CLUB_ID 
             FROM APPLICATION 
             WHERE APPLICATION_ID = :applicationId 
             AND APPLICATION_STATUS = 'Pending'`,
            { applicationId: applicationId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (appResult.rows.length === 0) {
            return res.status(404).json({
                message: "Application not found or already processed"
            });
        }

        const userId = appResult.rows[0].USER_ID;
        const clubId = appResult.rows[0].CLUB_ID;

        // 2. Check if user is already a member
        const memberCheck = await connection.execute(
            `SELECT USER_CLUB_ID 
             FROM USERS_CLUB 
             WHERE USER_ID = :userId 
             AND CLUB_ID = :clubId`,
            { userId: userId, clubId: clubId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (memberCheck.rows.length > 0) {
            return res.status(409).json({
                message: "User is already a member"
            });
        }

        // 3. Update application status to Approved
        await connection.execute(
            `UPDATE APPLICATION 
             SET APPLICATION_STATUS = 'Approved' 
             WHERE APPLICATION_ID = :applicationId`,
            { applicationId: applicationId }
        );

        // 4. Add user to the club (now with correct NUMBER type)
        await connection.execute(
            `INSERT INTO USERS_CLUB (USER_CLUB_ID, USER_ID, CLUB_ID)
             VALUES (user_club_seq.NEXTVAL, :userId, :clubId)`,
            { userId: userId, clubId: clubId }
        );

        // 5. Commit all changes
        await connection.commit();

        res.json({
            message: "Application approved and member added successfully"
        });

    } catch (err) {
        console.error('Approval error:', err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Rollback error:', rollbackErr);
            }
        }
        res.status(500).json({
            message: "Error approving application",
            error: err.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeErr) {
                console.error('Connection close error:', closeErr);
            }
        }
    }
});



// Reject applicant
app.put('/api/club-admin/applicants/:id/reject', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `UPDATE APPLICATION SET APPLICATION_STATUS = 'Rejected' WHERE APPLICATION_ID = :id`,
            { id: req.params.id }
        );

        await connection.commit();
        res.json({ message: "Application rejected successfully" });
    } catch (err) {
        console.error('Rejection error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error rejecting application" });
    } finally {
        if (connection) await connection.close();
    }
});