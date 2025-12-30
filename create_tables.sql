--------------------------------------------------------
--  File created - Monday-December-29-2025   
--------------------------------------------------------
--------------------------------------------------------
--  DDL for Table ADMIN_INFO
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."ADMIN_INFO" 
   (	"USER_ID" NUMBER(*,0), 
	"ADMIN_POSITION" VARCHAR2(20 BYTE), 
	"ADMIN_DEPARTMENT" VARCHAR2(50 BYTE)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table ANNOUNCEMENT
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."ANNOUNCEMENT" 
   (	"ANNC_ID" NUMBER(*,0), 
	"ANNC_TITLE" VARCHAR2(100 BYTE), 
	"ANNC_CONTENT" VARCHAR2(999 BYTE), 
	"ANNC_TYPE" VARCHAR2(50 BYTE), 
	"ANNC_DATE" DATE, 
	"CLUB_ID" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table APPLICATION
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."APPLICATION" 
   (	"APPLICATION_ID" NUMBER(*,0), 
	"APPLICATION_STATUS" VARCHAR2(10 BYTE), 
	"USER_ID" NUMBER(*,0), 
	"CLUB_ID" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table CATEGORY
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."CATEGORY" 
   (	"CATEGORY_ID" NUMBER(*,0), 
	"CATEGORY_NAME" VARCHAR2(100 BYTE)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table CLUBS
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."CLUBS" 
   (	"CLUB_ID" NUMBER(*,0), 
	"CLUB_NAME" VARCHAR2(100 BYTE), 
	"CLUB_MISSION" VARCHAR2(999 BYTE), 
	"CLUB_VISION" VARCHAR2(999 BYTE), 
	"CLUB_EMAIL" VARCHAR2(100 BYTE), 
	"CLUB_PHONE" VARCHAR2(20 BYTE), 
	"ADVISOR_NAME" VARCHAR2(100 BYTE), 
	"ADVISOR_EMAIL" VARCHAR2(50 BYTE), 
	"ADVISOR_PHONE" VARCHAR2(20 BYTE)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table CLUB_CATEGORY
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."CLUB_CATEGORY" 
   (	"CLUB_CAT_ID" NUMBER(*,0), 
	"CLUB_ID" NUMBER(*,0), 
	"CATEGORY_ID" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table EVENTS
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."EVENTS" 
   (	"EVENT_ID" NUMBER(*,0), 
	"EVENT_NAME" VARCHAR2(100 BYTE), 
	"EVENT_DESC" VARCHAR2(999 BYTE), 
	"EVENT_TYPE" VARCHAR2(50 BYTE), 
	"EVENT_DATETIME" DATE, 
	"CLUB_ID" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table STUDENT_INFO
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."STUDENT_INFO" 
   (	"USER_ID" NUMBER(*,0), 
	"STUDENT_NUMBER" NUMBER(*,0), 
	"STUDENT_PROGRAM" VARCHAR2(50 BYTE), 
	"STUDENT_FACULTY" VARCHAR2(50 BYTE), 
	"STUDENT_SEMESTER" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table USERS
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."USERS" 
   (	"USER_ID" NUMBER(*,0), 
	"USER_NAME" VARCHAR2(100 BYTE), 
	"USER_PASSWORD" VARCHAR2(50 BYTE), 
	"USER_EMAIL" VARCHAR2(100 BYTE), 
	"IS_ACTIVE" BOOLEAN, 
	"USER_TYPE" VARCHAR2(20 BYTE)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
--------------------------------------------------------
--  DDL for Table USERS_CLUB
--------------------------------------------------------

  CREATE TABLE "UITM_CLUBSPHERE"."USERS_CLUB" 
   (	"USER_CLUB_ID" VARCHAR2(20 BYTE), 
	"USER_ID" NUMBER(*,0), 
	"CLUB_ID" NUMBER(*,0)
   ) SEGMENT CREATION DEFERRED 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  TABLESPACE "USERS" ;
REM INSERTING into UITM_CLUBSPHERE.ADMIN_INFO
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.ANNOUNCEMENT
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.APPLICATION
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.CATEGORY
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.CLUBS
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.CLUB_CATEGORY
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.EVENTS
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.STUDENT_INFO
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.USERS
SET DEFINE OFF;
REM INSERTING into UITM_CLUBSPHERE.USERS_CLUB
SET DEFINE OFF;
--------------------------------------------------------
--  Constraints for Table EVENTS
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."EVENTS" ADD PRIMARY KEY ("EVENT_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table CATEGORY
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."CATEGORY" ADD PRIMARY KEY ("CATEGORY_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table CLUB_CATEGORY
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."CLUB_CATEGORY" ADD PRIMARY KEY ("CLUB_CAT_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table USERS_CLUB
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."USERS_CLUB" ADD PRIMARY KEY ("USER_CLUB_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table APPLICATION
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."APPLICATION" ADD PRIMARY KEY ("APPLICATION_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table USERS
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."USERS" ADD PRIMARY KEY ("USER_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table CLUBS
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."CLUBS" ADD PRIMARY KEY ("CLUB_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table ADMIN_INFO
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."ADMIN_INFO" ADD PRIMARY KEY ("USER_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table ANNOUNCEMENT
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."ANNOUNCEMENT" ADD PRIMARY KEY ("ANNC_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Constraints for Table STUDENT_INFO
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."STUDENT_INFO" ADD PRIMARY KEY ("USER_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 
  TABLESPACE "USERS"  ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table ADMIN_INFO
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."ADMIN_INFO" ADD CONSTRAINT "FK_ADMIN_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "UITM_CLUBSPHERE"."USERS" ("USER_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table ANNOUNCEMENT
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."ANNOUNCEMENT" ADD CONSTRAINT "FK_ANNOUNCEMENT_CLUB" FOREIGN KEY ("CLUB_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CLUBS" ("CLUB_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table APPLICATION
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."APPLICATION" ADD CONSTRAINT "FK_APP_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "UITM_CLUBSPHERE"."USERS" ("USER_ID") ENABLE;
  ALTER TABLE "UITM_CLUBSPHERE"."APPLICATION" ADD CONSTRAINT "FK_APP_CLUB" FOREIGN KEY ("CLUB_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CLUBS" ("CLUB_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table CLUB_CATEGORY
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."CLUB_CATEGORY" ADD CONSTRAINT "FK_CC_CLUB" FOREIGN KEY ("CLUB_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CLUBS" ("CLUB_ID") ENABLE;
  ALTER TABLE "UITM_CLUBSPHERE"."CLUB_CATEGORY" ADD CONSTRAINT "FK_CC_CATEGORY" FOREIGN KEY ("CATEGORY_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CATEGORY" ("CATEGORY_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table EVENTS
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."EVENTS" ADD CONSTRAINT "FK_EVENT_CLUB" FOREIGN KEY ("CLUB_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CLUBS" ("CLUB_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table STUDENT_INFO
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."STUDENT_INFO" ADD CONSTRAINT "FK_STUDENT_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "UITM_CLUBSPHERE"."USERS" ("USER_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table USERS_CLUB
--------------------------------------------------------

  ALTER TABLE "UITM_CLUBSPHERE"."USERS_CLUB" ADD CONSTRAINT "FK_UC_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "UITM_CLUBSPHERE"."USERS" ("USER_ID") ENABLE;
  ALTER TABLE "UITM_CLUBSPHERE"."USERS_CLUB" ADD CONSTRAINT "FK_UC_CLUB" FOREIGN KEY ("CLUB_ID")
	  REFERENCES "UITM_CLUBSPHERE"."CLUBS" ("CLUB_ID") ENABLE;
