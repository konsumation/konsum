CREATE TABLE "comment_date" (
  "date" datetime NOT NULL,
  "comment" varchar(255) NOT NULL);

CREATE TABLE "value_type" (
  "id" char(2) NOT NULL default '',
  "name" varchar(65) NOT NULL default '',
  "unit" varchar(65) NOT NULL default '',
  "ord" int(11) NOT NULL default '0',
  "color" varchar(20) default NULL,
  "decimal_places" tinyint(4) NOT NULL default '3');

CREATE TABLE value_date(date datetime NOT NULL default '0000-00-00 00:00:00',type char(2) NOT NULL default '',amount float NOT NULL default 0,CONSTRAINT value_date_ibfk_1 FOREIGN KEY(type)
REFERENCES value_type(id));

CREATE TABLE account(name char(64) NOT NULL,roles char(64) NOT NULL);
