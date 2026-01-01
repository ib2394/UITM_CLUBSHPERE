const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// 1. Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// 2. Oracle Database Configuration
const dbConfig = {
  user: "club_user",
  password: "club123",
  connectString: "localhost:1521/FREEPDB1"
};

// 3. Route to serve the login page as the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 4. API: User Login
app.post('/api/login', async (req, res) => {
  let connection;
  try {
    const { user_email, user_password, user_type } = req.body;
    connection = await oracledb.getConnection(dbConfig);

    const sql = `SELECT USER_ID, USER_NAME, USER_TYPE, USER_EMAIL 
                 FROM USERS 
                 WHERE USER_EMAIL = :email 
                 AND USER_PASSWORD = :pass 
                 AND USER_TYPE = :type`;

    const result = await connection.execute(sql, [user_email, user_password, user_type]);

    if (result.rows.length > 0) {
      res.status(200).send({
        message: "Login successful",
        user: {
          id: result.rows[0][0],
          name: result.rows[0][1],
          type: result.rows[0][2],
          email: result.rows[0][3]
        }
      });
    } else {
      res.status(401).send({ message: "Invalid credentials or user type" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 5. API: Student Registration
app.post('/api/register', async (req, res) => {
  let connection;
  try {
    const {
      user_name, user_email, user_password,
      student_number, student_program, student_faculty, student_semester
    } = req.body;

    connection = await oracledb.getConnection(dbConfig);

    const userSql = `INSERT INTO USERS (USER_ID, USER_NAME, USER_PASSWORD, USER_EMAIL, IS_ACTIVE, USER_TYPE) 
                     VALUES (user_seq.NEXTVAL, :name, :pass, :email, 1, 'student') 
                     RETURNING USER_ID INTO :id`;

    const result = await connection.execute(userSql, {
      name: user_name,
      pass: user_password,
      email: user_email,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    });

    const newUserId = result.outBinds.id[0];

    const infoSql = `INSERT INTO STUDENT_INFO (USER_ID, STUDENT_NUMBER, STUDENT_PROGRAM, STUDENT_FACULTY, STUDENT_SEMESTER) 
                     VALUES (:id, :sNum, :prog, :fac, :sem)`;

    await connection.execute(infoSql, {
      id: newUserId,
      sNum: student_number,
      prog: student_program,
      fac: student_faculty,
      sem: student_semester
    });

    await connection.commit();
    res.status(201).send({ message: "Registration successful!" });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Registration Failed", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 6. API: Get All Clubs (Admin)
app.get('/api/admin/clubs', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        c.CLUB_ID,
        c.CLUB_NAME,
        c.ADVISOR_NAME,
        cat.CATEGORY_NAME,
        (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.CLUB_ID = c.CLUB_ID) as MEMBER_COUNT
      FROM CLUBS c
      LEFT JOIN CLUB_CATEGORY cc ON c.CLUB_ID = cc.CLUB_ID
      LEFT JOIN CATEGORY cat ON cc.CATEGORY_ID = cat.CATEGORY_ID
      ORDER BY c.CLUB_NAME
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 7. API: Get All Students (Admin)
app.get('/api/admin/students', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        u.USER_ID,
        u.USER_NAME,
        si.STUDENT_NUMBER,
        si.STUDENT_FACULTY,
        si.STUDENT_PROGRAM,
        (SELECT COUNT(*) FROM USERS_CLUB uc WHERE uc.USER_ID = u.USER_ID) as CLUBS_JOINED
      FROM USERS u
      JOIN STUDENT_INFO si ON u.USER_ID = si.USER_ID
      WHERE u.USER_TYPE = 'student'
      ORDER BY u.USER_NAME
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 8. API: Get All Announcements (Admin)
app.get('/api/admin/announcements', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        a.ANNC_ID,
        a.ANNC_TITLE,
        a.ANNC_TYPE,
        a.ANNC_DATE,
        c.CLUB_NAME
      FROM ANNOUNCEMENT a
      JOIN CLUBS c ON a.CLUB_ID = c.CLUB_ID
      ORDER BY a.ANNC_DATE DESC
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 9. API: Get All Events (Admin)
app.get('/api/admin/events', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT 
        e.EVENT_ID,
        e.EVENT_NAME,
        e.EVENT_TYPE,
        e.EVENT_DATETIME,
        e.EVENT_DESC,
        c.CLUB_NAME
      FROM EVENTS e
      JOIN CLUBS c ON e.CLUB_ID = c.CLUB_ID
      ORDER BY e.EVENT_DATETIME DESC
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 10. API: Add New Club (Admin)
app.post('/api/admin/clubs', async (req, res) => {
  let connection;
  try {
    const {
      club_name, category_id, club_mission, club_vision, club_email,
      club_phone, advisor_name, advisor_email
    } = req.body;

    connection = await oracledb.getConnection(dbConfig);

    // Insert club
    const clubSql = `
      INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, CLUB_MISSION, CLUB_VISION, CLUB_EMAIL, CLUB_PHONE, ADVISOR_NAME, ADVISOR_EMAIL) 
      VALUES (club_seq.NEXTVAL, :name, :mission, :vision, :email, :phone, :advisor, :advisor_email) 
      RETURNING CLUB_ID INTO :id
    `;

    const clubResult = await connection.execute(clubSql, {
      name: club_name,
      mission: club_mission,
      vision: club_vision,
      email: club_email,
      phone: club_phone,
      advisor: advisor_name,
      advisor_email: advisor_email,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    });

    const newClubId = clubResult.outBinds.id[0];

    // Link club to category
    const categorySql = `
      INSERT INTO CLUB_CATEGORY (CLUB_CAT_ID, CLUB_ID, CATEGORY_ID) 
      VALUES (club_cat_seq.NEXTVAL, :club_id, :cat_id)
    `;

    await connection.execute(categorySql, {
      club_id: newClubId,
      cat_id: category_id
    });

    await connection.commit();
    res.status(201).send({ message: "Club added successfully!", clubId: newClubId });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to add club", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 11. API: Delete Club (Admin)
app.delete('/api/admin/clubs/:id', async (req, res) => {
  let connection;
  try {
    const clubId = req.params.id;
    connection = await oracledb.getConnection(dbConfig);

    // Delete related records first
    await connection.execute('DELETE FROM CLUB_CATEGORY WHERE CLUB_ID = :id', [clubId]);
    await connection.execute('DELETE FROM USERS_CLUB WHERE CLUB_ID = :id', [clubId]);
    await connection.execute('DELETE FROM ANNOUNCEMENT WHERE CLUB_ID = :id', [clubId]);
    await connection.execute('DELETE FROM EVENTS WHERE CLUB_ID = :id', [clubId]);
    await connection.execute('DELETE FROM APPLICATION WHERE CLUB_ID = :id', [clubId]);

    // Delete the club
    await connection.execute('DELETE FROM CLUBS WHERE CLUB_ID = :id', [clubId]);

    await connection.commit();
    res.status(200).send({ message: "Club deleted successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete club", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 12. API: Delete Student (Admin)
app.delete('/api/admin/students/:id', async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    connection = await oracledb.getConnection(dbConfig);

    // Delete related records first
    await connection.execute('DELETE FROM USERS_CLUB WHERE USER_ID = :id', [userId]);
    await connection.execute('DELETE FROM APPLICATION WHERE USER_ID = :id', [userId]);
    await connection.execute('DELETE FROM STUDENT_INFO WHERE USER_ID = :id', [userId]);

    // Delete the user
    await connection.execute('DELETE FROM USERS WHERE USER_ID = :id', [userId]);

    await connection.commit();
    res.status(200).send({ message: "Student deleted successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete student", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 13. API: Delete Announcement (Admin)
app.delete('/api/admin/announcements/:id', async (req, res) => {
  let connection;
  try {
    const anncId = req.params.id;
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute('DELETE FROM ANNOUNCEMENT WHERE ANNC_ID = :id', [anncId]);

    await connection.commit();
    res.status(200).send({ message: "Announcement deleted successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete announcement", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 14. API: Get Categories
app.get('/api/categories', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = 'SELECT CATEGORY_ID, CATEGORY_NAME FROM CATEGORY ORDER BY CATEGORY_NAME';
    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Database Error", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// 15. API: Delete Event (Admin)
app.delete('/api/admin/events/:id', async (req, res) => {
  let connection;
  try {
    const eventId = req.params.id;
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute('DELETE FROM EVENTS WHERE EVENT_ID = :id', [eventId]);

    await connection.commit();
    res.status(200).send({ message: "Event deleted successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete event", error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 ClubSphere Server running at http://localhost:${PORT}`);
});