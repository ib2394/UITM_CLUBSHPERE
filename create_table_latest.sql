SET DEFINE OFF;
--------------------------------------------------------
-- 1. DROP EXISTING TABLES
--------------------------------------------------------
BEGIN
 FOR r IN (SELECT table_name FROM user_tables WHERE table_name IN
 ('ADMIN_INFO', 'ANNOUNCEMENT', 'APPLICATION', 'CATEGORY', 'CLUBS',
 'CLUB_CATEGORY', 'EVENTS', 'STUDENT_INFO', 'USERS', 'USERS_CLUB'))
 LOOP
 EXECUTE IMMEDIATE 'DROP TABLE ' || r.table_name || ' CASCADE CONSTRAINTS';
 END LOOP;
END;
/

--------------------------------------------------------
-- 2. CREATE TABLES (Matched to ERD Diagram)
--------------------------------------------------------

-- USERS Table
CREATE TABLE USERS (
 USER_ID NUMBER PRIMARY KEY,
 USER_NAME VARCHAR2(100),
 USER_PASSWORD VARCHAR2(100), -- Increased length for security/hashing
 USER_EMAIL VARCHAR2(50) UNIQUE,
 IS_ACTIVE NUMBER(1), -- Using 1/0 for Boolean compatibility in Oracle
 USER_TYPE VARCHAR2(20)
);

-- STUDENT_INFO Table
CREATE TABLE STUDENT_INFO (
 USER_ID NUMBER PRIMARY KEY REFERENCES USERS(USER_ID),
 STUDENT_NUMBER NUMBER,
 STUDENT_PROGRAM VARCHAR2(50),
 STUDENT_FACULTY VARCHAR2(50),
 STUDENT_SEMESTER NUMBER
);

-- ADMIN_INFO Table (Newly added from Diagram)
CREATE TABLE ADMIN_INFO (
 USER_ID NUMBER PRIMARY KEY REFERENCES USERS(USER_ID),
 ADMIN_POSITION VARCHAR2(20),
 ADMIN_DEPARTMENT VARCHAR2(50)
);

-- CLUBS Table
CREATE TABLE CLUBS (
 CLUB_ID NUMBER PRIMARY KEY,
 CLUB_NAME VARCHAR2(100),
 CLUB_MISSION VARCHAR2(999),
 CLUB_VISION VARCHAR2(999),
 CLUB_EMAIL VARCHAR2(100),
 CLUB_PHONE VARCHAR2(20),
 ADVISOR_NAME VARCHAR2(100),
 ADVISOR_EMAIL VARCHAR2(50),
 ADVISOR_PHONE VARCHAR2(20)
);

-- CATEGORY Table
CREATE TABLE CATEGORY (
 CATEGORY_ID NUMBER PRIMARY KEY,
 CATEGORY_NAME VARCHAR2(100)
);

-- CLUB_CATEGORY Table
CREATE TABLE CLUB_CATEGORY (
 CLUB_CAT_ID NUMBER PRIMARY KEY,
 CLUB_ID NUMBER REFERENCES CLUBS(CLUB_ID),
 CATEGORY_ID NUMBER REFERENCES CATEGORY(CATEGORY_ID)
);

-- EVENTS Table
CREATE TABLE EVENTS (
 EVENT_ID NUMBER PRIMARY KEY,
 EVENT_NAME VARCHAR2(100),
 EVENT_DESC VARCHAR2(999),
 EVENT_TYPE VARCHAR2(50),
 EVENT_DATETIME DATE,
 CLUB_ID NUMBER REFERENCES CLUBS(CLUB_ID)
);

-- ANNOUNCEMENT Table
CREATE TABLE ANNOUNCEMENT (
 ANNC_ID NUMBER PRIMARY KEY,
 ANNC_TITLE VARCHAR2(100),
 ANNC_CONTENT VARCHAR2(999),
 ANNC_TYPE VARCHAR2(50),
 ANNC_DATE_TIME DATE, -- Name updated to match diagram
 CLUB_ID NUMBER REFERENCES CLUBS(CLUB_ID)
);

-- APPLICATION Table
CREATE TABLE APPLICATION (
 APPLICATION_ID NUMBER PRIMARY KEY,
 APPLICATION_STATUS VARCHAR2(10),
 USER_ID NUMBER REFERENCES USERS(USER_ID),
 CLUB_ID NUMBER REFERENCES CLUBS(CLUB_ID)
);

-- USERS_CLUB Table
CREATE TABLE USERS_CLUB (
 USER_CLUB_ID NUMBER PRIMARY KEY,
 ROLE VARCHAR2(20), -- Added column from diagram
 USER_ID NUMBER REFERENCES USERS(USER_ID),
 CLUB_ID NUMBER REFERENCES CLUBS(CLUB_ID)
);

--------------------------------------------------------
-- 3. SEQUENCES
--------------------------------------------------------
DROP SEQUENCE user_seq;
DROP SEQUENCE club_seq;
DROP SEQUENCE club_cat_seq;
DROP SEQUENCE application_seq;

CREATE SEQUENCE user_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE club_seq START WITH 200 INCREMENT BY 1;
CREATE SEQUENCE club_cat_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE application_seq START WITH 100 INCREMENT BY 1;

COMMIT;

--------------------------------------------------------
-- 1. CATEGORIES (3 Categories)
--------------------------------------------------------
INSERT INTO CATEGORY VALUES (1, 'Technology');
INSERT INTO CATEGORY VALUES (2, 'Sports');
INSERT INTO CATEGORY VALUES (3, 'Academic');

--------------------------------------------------------
-- 2. USERS (1 Admin, 3 Club Admins, 10 Students)
--------------------------------------------------------
-- System Administrator
INSERT INTO USERS VALUES (99, 'HEP System Admin', 'admin123', 'admin@uitm.edu.my', 1, 'admin');

-- Dedicated Club Admins (Committee Members - distinct from Advisors)
INSERT INTO USERS VALUES (10, 'HAKIM COMMITTEE', 'css123', 'css_admin@uitm.edu.my', 1, 'club_admin');
INSERT INTO USERS VALUES (11, 'ATIQA COMMITTEE', 'badm123', 'badminton_admin@uitm.edu.my', 1, 'club_admin');
INSERT INTO USERS VALUES (12, 'SYAZ COMMITTEE', 'deb123', 'debate_admin@uitm.edu.my', 1, 'club_admin');

-- 10 Regular Students
INSERT INTO USERS VALUES (1, 'IBTISAM ASRUL', 'pass123', 'student1@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (2, 'AHMAD HUSAIN', 'pass123', 'student2@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (3, 'NUR FARAH', 'pass123', 'student3@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (4, 'SITI AISYAH', 'pass123', 'student4@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (5, 'MOHD RIZAL', 'pass123', 'student5@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (6, 'DINA AZMAN', 'pass123', 'student6@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (7, 'ZAFRAN KHAN', 'pass123', 'student7@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (8, 'ALYA JAAFAR', 'pass123', 'student8@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (9, 'IMAN HAKIMI', 'pass123', 'student9@uitm.edu.my', 1, 'student');
INSERT INTO USERS VALUES (100, 'SARAH OMAR', 'pass123', 'student10@uitm.edu.my', 1, 'student');

--------------------------------------------------------
-- 3. STUDENT INFO (For all 13 Student-based accounts)
--------------------------------------------------------
-- Club Admins (also students)
INSERT INTO STUDENT_INFO VALUES (10, 2024000001, 'CS264', 'FSKM', 3);
INSERT INTO STUDENT_INFO VALUES (11, 2024000002, 'CS264', 'FSKM', 3);
INSERT INTO STUDENT_INFO VALUES (12, 2024000003, 'CS264', 'FSKM', 3);
-- Regular Students
INSERT INTO STUDENT_INFO VALUES (1, 2025000001, 'CS230', 'FSKM', 2);
INSERT INTO STUDENT_INFO VALUES (2, 2025000002, 'CS230', 'FSKM', 2);
INSERT INTO STUDENT_INFO VALUES (3, 2025000003, 'CS230', 'FSKM', 3);
INSERT INTO STUDENT_INFO VALUES (4, 2025000004, 'CS264', 'FSKM', 4);
INSERT INTO STUDENT_INFO VALUES (5, 2025000005, 'CS230', 'FSKM', 1);
INSERT INTO STUDENT_INFO VALUES (6, 2025000006, 'CS264', 'FSKM', 2);
INSERT INTO STUDENT_INFO VALUES (7, 2025000007, 'CS230', 'FSKM', 3);
INSERT INTO STUDENT_INFO VALUES (8, 2025000008, 'CS264', 'FSKM', 4);
INSERT INTO STUDENT_INFO VALUES (9, 2025000009, 'CS230', 'FSKM', 2);
INSERT INTO STUDENT_INFO VALUES (100, 2025000010, 'CS264', 'FSKM', 1);

--------------------------------------------------------
-- 4. CLUBS (Advisors remain staff, Admins are students)
--------------------------------------------------------
-- Club 1: Technology
INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, ADVISOR_NAME, ADVISOR_EMAIL) 
VALUES (101, 'Computer Science Society', 'Dr. Ahmad', 'ahmad@staff.uitm.edu.my');

-- Club 2: Sports
INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, ADVISOR_NAME, ADVISOR_EMAIL) 
VALUES (102, 'Badminton Club', 'Coach Faizal', 'faizal@staff.uitm.edu.my');

-- Club 3: Academic
INSERT INTO CLUBS (CLUB_ID, CLUB_NAME, ADVISOR_NAME, ADVISOR_EMAIL) 
VALUES (103, 'Debate Society', 'Prof. Sarah', 'sarah@staff.uitm.edu.my');

--------------------------------------------------------
-- 5. RELATIONSHIPS & CATEGORIES
--------------------------------------------------------
INSERT INTO CLUB_CATEGORY VALUES (1, 101, 1);
INSERT INTO CLUB_CATEGORY VALUES (2, 102, 2);
INSERT INTO CLUB_CATEGORY VALUES (3, 103, 3);

-- CRITICAL: Linking the 3 Club Admins to their respective Clubs
INSERT INTO USERS_CLUB (USER_CLUB_ID, ROLE, USER_ID, CLUB_ID) VALUES (1, 'Club Admin', 10, 101);
INSERT INTO USERS_CLUB (USER_CLUB_ID, ROLE, USER_ID, CLUB_ID) VALUES (2, 'Club Admin', 11, 102);
INSERT INTO USERS_CLUB (USER_CLUB_ID, ROLE, USER_ID, CLUB_ID) VALUES (3, 'Club Admin', 12, 103);

UPDATE CLUBS SET 
    CLUB_MISSION = 'To empower students through hands-on technical workshops and peer mentoring.',
    CLUB_VISION = 'To be the leading digital innovation hub for all UiTM technical students.',
    CLUB_EMAIL = 'css.hq@uitm.edu.my',
    CLUB_PHONE = '03-55440001',
    ADVISOR_PHONE = '012-3456789'
WHERE CLUB_ID = 101;

UPDATE CLUBS SET 
    CLUB_MISSION = 'To promote a healthy lifestyle and sportsmanship among students of all skill levels.',
    CLUB_VISION = 'To produce national-level athletes who represent UiTM with excellence.',
    CLUB_EMAIL = 'badminton@uitm.edu.my',
    CLUB_PHONE = '03-55440002',
    ADVISOR_PHONE = '019-8765432'
WHERE CLUB_ID = 102;

UPDATE CLUBS SET 
    CLUB_MISSION = 'To foster critical thinking and articulate public speaking skills.',
    CLUB_VISION = 'To create eloquent leaders capable of global discourse and advocacy.',
    CLUB_EMAIL = 'debate@uitm.edu.my',
    CLUB_PHONE = '03-55440003',
    ADVISOR_PHONE = '011-22334455'
WHERE CLUB_ID = 103;