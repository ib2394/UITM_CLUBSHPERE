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

        if (!user_email || !club_id) {
            return res.status(400).json({ message: "Email and club ID are required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        // Get user ID
        const userRes = await connection.execute(
            `SELECT USER_ID FROM USERS WHERE LOWER(USER_EMAIL) = LOWER(:email)`,
            [user_email],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const userId = userRes.rows[0].USER_ID;

        // Check if already applied
        const existingApp = await connection.execute(
            `SELECT APPLICATION_ID FROM APPLICATION 
             WHERE USER_ID = :uid AND CLUB_ID = :cid`,
            { uid: userId, cid: club_id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (existingApp.rows.length > 0) {
            return res.status(409).json({ message: "You have already applied to this club" });
        }

        // Create application
        await connection.execute(
            `INSERT INTO APPLICATION (APPLICATION_ID, APPLICATION_STATUS, USER_ID, CLUB_ID) 
             VALUES (application_seq.NEXTVAL, 'Pending', :u, :c)`,
            { u: userId, c: club_id }
        );

        await connection.commit();
        res.status(201).json({ message: "Application submitted successfully" });
    } catch (err) {
        console.error('Application error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error submitting application" });
    } finally {
        if (connection) await connection.close();
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
        const { club_name, category_id, advisor_name, club_email } = req.body;

        if (!club_name || !advisor_name) {
            return res.status(400).json({ message: "Club name and advisor name are required" });
        }

        connection = await oracledb.getConnection(dbConfig);

        const sql = `
            INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, CLUB_EMAIL, ADVISOR_NAME) 
            VALUES (club_seq.NEXTVAL, :name, :email, :adv) 
            RETURNING CLUB_ID INTO :id
        `;

        const result = await connection.execute(sql, {
            name: club_name,
            email: club_email,
            adv: advisor_name,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });

        const newClubId = result.outBinds.id[0];

        if (category_id) {
            await connection.execute(
                `INSERT INTO CLUB_CATEGORY (CLUB_CAT_ID, CLUB_ID, CATEGORY_ID) 
                 VALUES (club_cat_seq.NEXTVAL, :cid, :catid)`,
                { cid: newClubId, catid: category_id }
            );
        }

        await connection.commit();
        res.json({ message: "Club added successfully", clubId: newClubId });
    } catch (err) {
        console.error('Club creation error:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error creating club" });
    } finally {
        if (connection) await connection.close();
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