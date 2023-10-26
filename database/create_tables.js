const database = include("databaseConnection");

async function createTables() {
  let createUserTypeSQL = `
	CREATE TABLE IF NOT EXISTS user_type (
		id INT PRIMARY KEY AUTO_INCREMENT,
		name VARCHAR(255) NOT NULL	  
	);
`;

  let createUserSQL = `
	CREATE TABLE IF NOT EXISTS user (
		user_id INT PRIMARY KEY AUTO_INCREMENT,
		username VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		password VARCHAR(255) NOT NULL,
		user_type_id INT NOT NULL,
		hashed_uid VARCHAR(255) NOT NULL,
		FOREIGN KEY (user_type_id) REFERENCES user_type(id),
    UNIQUE (email),
		UNIQUE (username)
	);
`;

  let createContent = `
CREATE TABLE IF NOT EXISTS content (
	content_id INT PRIMARY KEY AUTO_INCREMENT,
	content_type_id INT NOT NULL,
	user_id INT NOT NULL,
	active_status INT,
	total_hits INT,
	last_hit DATETIME,
	created_date DATETIME NOT NULL,
	FOREIGN KEY (user_id) REFERENCES user(user_id),
	FOREIGN KEY (content_type_id) REFERENCES content_type(content_type_id)
);
`;

  let insertUserTypeRowsSQL = `
	INSERT INTO user_type (name) VALUES ('admin'), ('user');
`;

  let createContentType = `
CREATE TABLE IF NOT EXISTS content_type (
	content_type_id INT PRIMARY KEY AUTO_INCREMENT,
	type_value VARCHAR(255) NOT NULL
);
`;

  let createContentTag = `
  CREATE TABLE IF NOT EXISTS content_tag (
	content_tag_id INT PRIMARY KEY AUTO_INCREMENT,
	tag_id INT NOT NULL,
	content_type_id INT NOT NULL,
	FOREIGN KEY (tag_id) REFERENCES tag(tag_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
	FOREIGN KEY (content_type_id) REFERENCES content_type(content_type_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
`;

  let createTag = `
CREATE TABLE IF NOT EXISTS tag (
	tag_id INT PRIMARY KEY AUTO_INCREMENT,
	description VARCHAR(255) NOT NULL
);
`;

  let createLink = `
CREATE TABLE IF NOT EXISTS link (
	link_id INT PRIMARY KEY AUTO_INCREMENT,
	content_id INT NOT NULL,
	original_url VARCHAR(255) NOT NULL,
	shortened_url VARCHAR(255) NOT NULL,
	FOREIGN KEY (content_id) REFERENCES content(content_id)
);
`;

  let createText = `
CREATE TABLE IF NOT EXISTS text (
	text_id INT PRIMARY KEY AUTO_INCREMENT,
	content_id INT NOT NULL,
	text_value TEXT NOT NULL,
	FOREIGN KEY (content_id) REFERENCES content(content_id)
);
`;

  let createImage = `
CREATE TABLE IF NOT EXISTS image (
	image_id INT PRIMARY KEY AUTO_INCREMENT,
	content_id INT NOT NULL,
	image_uuid VARCHAR(255) NOT NULL,
	FOREIGN KEY (content_id) REFERENCES content(content_id)
);
`;

  let appendTags = `
 INSERT INTO tag (description)
 VALUES
   ('sports'),
   ('cats'),
   ('dogs'),
   ('cars'),
   ('dance'),
   ('science'),
   ('technology'),
   ('movies'),
   ('wallpaper'),
   ('food');
 `;

  let insertContentTypes = `
 INSERT INTO content_type (type_value)
 VALUES 
   ('link'),
   ('image'),
   ('text');
`;

  try {
    const resultsTag = await database.query(createTag);
    const resultsContentType = await database.query(createContentType);
    const resultsuserType = await database.query(createUserTypeSQL);
    const resultsUser = await database.query(createUserSQL);
    const resultsContentTag = await database.query(createContentTag);
    const resultsContent = await database.query(createContent);
    const resultsInsertUserTypeRows = await database.query(
      insertUserTypeRowsSQL
    );
    const resultsLink = await database.query(createLink);
    const resultsText = await database.query(createText);
    const resultsImage = await database.query(createImage);
    const resultAppendTags = await database.query(appendTags);
    const resultsAppendContentType = await database.query(insertContentTypes);

    console.log("Successfully created tables");
    console.log(resultsUser[0]);
    console.log(resultsuserType[0]);
    console.log(resultsContent[0]);
    console.log(resultsInsertUserTypeRows[0]);
    console.log(resultsContentType[0]);
    console.log(resultsContentTag[0]);
    console.log(resultsTag[0]);
    console.log(resultsLink[0]);
    console.log(resultsText[0]);
    console.log(resultsImage[0]);
    console.log(resultAppendTags[0]);
    console.log(resultsAppendContentType[0]);

    return true;
  } catch (err) {
    console.log("Error creating tables");
    console.log(err);
    return false;
  }
}

module.exports = { createTables };
