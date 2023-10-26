const database = include("databaseConnection");
const crypto = require("crypto");

const getUserImages = async (userId) => {
  const query = `
        SELECT 
          content.content_id,
          content.active_status,
          content.total_hits,
          content.created_date,
          content.last_hit,
          content.content_url,
          tag.description as image_tag,
          image.image_id,
          image.content_id as image_content_id,
          image.image_uuid
        FROM user
        JOIN content ON user.user_id = content.user_id
        JOIN image ON content.content_id = image.content_id
        JOIN content_tag ON content.content_id = content_tag.content_id
        JOIN tag ON content_tag.tag_id = tag.tag_id
        WHERE user.user_id = ? AND content.content_type_id = 2;
  `;

  const [rows] = await database.query(query, [userId]);
  return rows;
};

const getUserLinks = async (userId) => {
  const query = `
        SELECT 
            content.content_id, 
            link.original_url,
            content_tag.tag_id AS link_tag,
            content.active_status,
            content.total_hits,
            content.created_date,
            content.last_hit,
            content.content_url,
            tag.description as tag_description
        FROM link
        INNER JOIN content ON link.content_id = content.content_id
        INNER JOIN content_tag ON content.content_id = content_tag.content_id
        INNER JOIN tag ON content_tag.tag_id = tag.tag_id
        WHERE content.user_id = ?;
    `;
  const [rows] = await database.query(query, [userId]);
  return rows;
};

const getUserTexts = async (userId) => {
  const query = `
        SELECT 
            text.text_value,
            tag.description as text_tag,
            content.content_id,
            content.active_status,
            content.total_hits,
            content.created_date,
            content.last_hit,
            content.content_url
        FROM content
        JOIN text ON content.content_id = text.content_id
        JOIN content_tag ON content.content_id = content_tag.content_id
        JOIN tag ON content_tag.tag_id = tag.tag_id
        WHERE content.user_id = ? AND content.content_type_id = 3;
  `;

  const [results] = await database.query(query, [userId]);
  return results;
};

const getDescriptions = async () => {
  const query = "SELECT tag_id, description FROM tag";
  const [rows] = await database.query(query);
  return rows;
};

function generateShortCode(longUrl) {
  const hash = crypto.createHash("sha256");
  hash.update(longUrl);
  const base64String = hash.digest("base64").replace(/\//g, "_"); // Replace "/" with "_"
  return base64String.slice(0, 8); // Take the first 8 characters
}

async function shortenUrl(longUrl) {
  try {
    const shortCode = generateShortCode(longUrl);
    return shortCode;
  } catch (error) {
    throw error;
  }
}

async function insertLink(contentId, originalUrl) {
  try {
    const insertLinkQuery = `
        INSERT INTO link (content_id, original_url)
        VALUES (?, ?);
      `;

    const result = await database.query(insertLinkQuery, [
      contentId,
      originalUrl,
    ]);
    return result;
  } catch (error) {
    throw error;
  }
}

async function insertContent(
  contentTypeId,
  userId,
  activeStatus,
  totalHits,
  createdDate,
  lastHit,
  contentURL
) {
  console.log(
    "\x1b[1m\x1b[31m%s\x1b[0m",
    "contents.js insertContent we INSERT",
    contentTypeId,
    userId,
    activeStatus,
    totalHits,
    lastHit,
    createdDate,
    contentURL
  );
  try {
    const insertContentQuery = `
        INSERT INTO content (content_type_id, user_id, active_status, total_hits, last_hit, created_date, content_url)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

    const result = await database.query(insertContentQuery, [
      contentTypeId,
      userId,
      activeStatus,
      totalHits,
      lastHit,
      createdDate,
      contentURL,
    ]);

    console.log("\x1b[31m%s\x1b[0m", "Result of insertContentQuery", result);

    const ret_last_insert_id = `
      SELECT LAST_INSERT_ID();
      `;

    const lastInsertId = await database.query(ret_last_insert_id);
    console.log("\x1b[31m%s\x1b[0m", "lastInsertId object", lastInsertId);

    return lastInsertId[0][0]["LAST_INSERT_ID()"];
  } catch (error) {
    throw error;
  }
}

async function insertContentTag(tagId, contentId) {
  try {
    const insertContentTagQuery = `
        INSERT INTO content_tag (tag_id, content_id)
        VALUES (?, ?);
      `;

    const result = await database.query(insertContentTagQuery, [
      tagId,
      contentId,
    ]);
    return result;
  } catch (error) {
    throw error;
  }
}

async function insertImage(contentId, image_uuid) {
  try {
    const insertImageQuery = `
        INSERT INTO image (content_id, image_uuid)
        VALUES (?, ?);
      `;
    const result = await database.query(insertImageQuery, [
      contentId,
      image_uuid,
    ]);
    return result;
  } catch (error) {
    throw error;
  }
}

async function updateLinkHits(contentId) {
  const updateQuery = `
      UPDATE content
      SET total_hits = total_hits + 1,
          last_hit = NOW()
      WHERE content_id = ?;
    `;
  try {
    await database.query(updateQuery, [contentId]);
  } catch (error) {
    throw error;
  }
}

async function insertText(contentId, textValue) {
  try {
    const insertTextQuery = `
        INSERT INTO text (content_id, text_value)
        VALUES (?, ?);
      `;
    const result = await database.query(insertTextQuery, [
      contentId,
      textValue,
    ]);
    return result;
  } catch (error) {
    throw error;
  }
}

const updateLink = async (
  contentId,
  originalUrl,
  shortenedUrl,
  linkTag,
  activeStatus
) => {
  const linkQuery = `
    UPDATE link
    SET original_url = ?
    WHERE content_id = ?;
  `;

  const contentQuery = `
    UPDATE content
    SET active_status = ?,
        content_url = ?
    WHERE content_id = ?;
  `;

  const contentTagQuery = `
    UPDATE content_tag
    SET tag_id = ?
    WHERE content_id = ?;
  `;

  await database.query(linkQuery, [originalUrl, contentId]);
  await database.query(contentQuery, [activeStatus, shortenedUrl, contentId]);
  await database.query(contentTagQuery, [linkTag, contentId]);
};

async function updateTextContentValues(
  contentId,
  textValue,
  textTag,
  contentUrl,
  activeStatus
) {
  console.log(contentId, textValue, textTag, contentUrl, activeStatus);
  const updateContentQuery = `
    UPDATE content
    SET active_status = ?,
        content_url = ?
    WHERE content_id = ?;
  `;

  const updateTextQuery = `
    UPDATE text
    SET text_value = ?
    WHERE content_id = ?;
  `;

  const updateContentTagQuery = `
    UPDATE content_tag
    SET tag_id = ?
    WHERE content_id = ?;
  `;

  await database.query(updateContentQuery, [
    activeStatus,
    contentUrl,
    contentId,
  ]);
  await database.query(updateTextQuery, [textValue, contentId]);
  await database.query(updateContentTagQuery, [textTag, contentId]);
}

const checkShortenedUrlExistence = async (shortenedUrl) => {
  const contentQuery = `
    SELECT * FROM content
    WHERE content_url = ?;
  `;

  try {
    const [contentRows] = await database.query(contentQuery, [shortenedUrl]);

    return contentRows.length > 0;
  } catch (error) {
    console.error("Error checking shortened URL existence:", error);
    throw error;
  }
};

async function getTextContentById(contentId) {
  const query = `
    SELECT
      text.text_value,
      content.content_url as shortened_url,
      content.active_status,
      content.content_id,
      content_tag.tag_id, 
      tag.description as tag_description
    FROM text
    JOIN content ON text.content_id = content.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE text.content_id = ?; 
  `;
  const [result] = await database.query(query, [contentId]);
  return result[0];
}

async function getImageContentById(contentId) {
  const query = `
    SELECT
      image.image_uuid,
      content.content_url as shortened_url,
      content.active_status,
      content.content_id,
      content_tag.tag_id, 
      tag.description as tag_description
    FROM image
    JOIN content ON image.content_id = content.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE image.content_id = ?; 
  `;
  const [result] = await database.query(query, [contentId]);
  return result[0];
}

async function updateImageContentValues(
  contentId,
  image_uuid,
  imageTag,
  contentUrl,
  activeStatus
) {
  console.log(
    "update Image Content Values",
    contentId,
    image_uuid,
    imageTag,
    contentUrl,
    activeStatus
  );
  const updateContentQuery = `
    UPDATE content
    SET active_status = ?,
        content_url = ?
    WHERE content_id = ?;
  `;

  const updateImageQuery = `
    UPDATE image
    SET image_uuid = ?
    WHERE content_id = ?;
  `;

  const updateContentTagQuery = `
    UPDATE content_tag
    SET tag_id = ?
    WHERE content_id = ?;
  `;

  await database.query(updateContentQuery, [
    activeStatus,
    contentUrl,
    contentId,
  ]);
  await database.query(updateImageQuery, [image_uuid, contentId]);
  await database.query(updateContentTagQuery, [imageTag, contentId]);
}

async function updateImageContentValuesNoImage(
  contentId,
  imageTag,
  contentUrl,
  activeStatus
) {
  console.log(
    "update Image Content Values with no image",
    contentId,
    imageTag,
    contentUrl,
    activeStatus
  );
  const updateContentQuery = `
    UPDATE content
    SET active_status = ?,
        content_url = ?
    WHERE content_id = ?;
  `;

  const updateContentTagQuery = `
    UPDATE content_tag
    SET tag_id = ?
    WHERE content_id = ?;
  `;

  await database.query(updateContentQuery, [
    activeStatus,
    contentUrl,
    contentId,
  ]);
  await database.query(updateContentTagQuery, [imageTag, contentId]);
}

const getLinkById = async (contentId) => {
  const query = `
    SELECT 
      link.original_url,
      content.content_url as shortened_url,
      content.active_status,
      content.content_id,
      content_tag.tag_id, 
      tag.description as tag_description
    FROM link
    JOIN content ON link.content_id = content.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE link.content_id = ?; 
  `;

  const [rows] = await database.query(query, [contentId]);
  return rows[0];
};

const getAllTags = async () => {
  const query = `
    SELECT * FROM tag;
  `;

  try {
    const [rows] = await database.query(query);
    return rows;
  } catch (error) {
    throw error;
  }
};

const getContentByURL = async (content_url) => {
  const query = `
    SELECT
      *
    FROM content
    WHERE content.content_url = ?;
  `;

  const [result] = await database.query(query, [content_url]);
  console.log("\x1b[31m%s\x1b[0m", "getContentByURL result", result);
  console.log("\x1b[31m%s\x1b[0m", "getContentByURL result[0]", result[0]);
  const content = result[0];

  if (content.content_type_id === 1) {
    const joinQuery = `
      SELECT
        content.content_id,
        content.content_type_id,
        content.user_id,
        content.total_hits,
        content.last_hit,
        content.created_date,
        content.content_url,
        content.active_status,
        link.original_url,
        tag.description as tag
      FROM link
      INNER JOIN content ON link.content_id = content.content_id
      INNER JOIN content_tag ON content.content_id = content_tag.content_id
      INNER JOIN tag ON content_tag.tag_id = tag.tag_id
      WHERE content.content_id = ?;
    `;
    const [link] = await database.query(joinQuery, [content.content_id]);
    console.log("\x1b[31m%s\x1b[0m", "returned link", link);
    return link;
  } else if (content.content_type_id === 2) {
    const joinQuery = `
    SELECT 
          content.content_id,
          content.content_type_id,
          content.user_id,
          content.total_hits,
          content.last_hit,
          content.created_date,
          content.content_url,
          content.active_status,
          tag.description as tag,
          image.image_uuid
        FROM content
        JOIN image ON content.content_id = image.content_id
        JOIN content_tag ON content.content_id = content_tag.content_id
        JOIN tag ON content_tag.tag_id = tag.tag_id
        WHERE content.content_id = ?;
  `;
    const [image] = await database.query(joinQuery, [content.content_id]);
    console.log("\x1b[31m%s\x1b[0m", "returned image", image);
    return image;
  } else {
    const joinQuery = `
    SELECT 
          content.content_id,
          content.user_id,
          content.total_hits,
          content.last_hit,
          content.created_date,
          content.content_url,
          content.content_type_id,
          content.active_status,
          tag.description as tag,
          text.text_value
        FROM content
        JOIN text ON content.content_id = text.content_id
        JOIN content_tag ON content.content_id = content_tag.content_id
        JOIN tag ON content_tag.tag_id = tag.tag_id
        WHERE content.content_id = ?;
  `;
    const [text] = await database.query(joinQuery, [content.content_id]);
    console.log("\x1b[31m%s\x1b[0m", "returned text", text);
    return text;
  }
};

async function deleteImage(contentId) {
  try {
    await database.query("DELETE FROM content_tag WHERE content_id = ?", [
      contentId,
    ]);

    await database.query("DELETE FROM image WHERE content_id = ?", [contentId]);

    await database.query("DELETE FROM content WHERE content_id = ?", [
      contentId,
    ]);
  } catch (error) {
    throw new Error("Error deleting image: " + error.message);
  }
}

async function deleteLink(contentId) {
  try {
    await database.query("DELETE FROM content_tag WHERE content_id = ?", [
      contentId,
    ]);

    await database.query("DELETE FROM link WHERE content_id = ?", [contentId]);

    await database.query("DELETE FROM content WHERE content_id = ?", [
      contentId,
    ]);
  } catch (error) {
    throw new Error("Error deleting link: " + error.message);
  }
}

async function deleteText(contentId) {
  try {
    await database.query("DELETE FROM content_tag WHERE content_id = ?", [
      contentId,
    ]);

    await database.query("DELETE FROM text WHERE content_id = ?", [contentId]);

    await database.query("DELETE FROM content WHERE content_id = ?", [
      contentId,
    ]);
  } catch (error) {
    throw new Error("Error deleting text: " + error.message);
  }
}

const getTopImage = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,  
      image.image_uuid,
      tag.description as tag,
      content.active_status
    FROM content
    JOIN image ON content.content_id = image.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.active_status = 1
    ORDER BY content.total_hits DESC
    LIMIT 1;
  `;

  const [result] = await database.query(query);
  return result[0];
};

const getTopLink = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,  
      tag.description as tag,
      content.active_status
    FROM content
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.content_type_id = '1' AND content.active_status = 1
    ORDER BY content.total_hits DESC
    LIMIT 1;
  `;

  const [result] = await database.query(query);
  return result[0];
};

const getTopText = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,
      text.text_value,
      tag.description as tag,
      content.active_status
    FROM content
    JOIN text ON content.content_id = text.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.active_status = 1
    ORDER BY content.total_hits DESC
    LIMIT 1;
  `;

  const [result] = await database.query(query);
  return result[0];
};

const getAllImages = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,  
      content.content_type_id,
      image.image_uuid,
      tag.description as tag,
      content.active_status
    FROM content
    JOIN image ON content.content_id = image.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.content_type_id = '2' AND content.active_status = 1
  `;

  const [results] = await database.query(query);
  return results;
};

const getAllLinks = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,  
      content.content_type_id,
      tag.description as tag,
      content.active_status
    FROM content
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.content_type_id = '1' AND content.active_status = 1
  `;

  const [results] = await database.query(query);
  return results;
};

const getAllTexts = async () => {
  const query = `
    SELECT 
      content.content_id,
      content.content_url,
      content.content_type_id,
      text.text_value,
      tag.description as tag,
      content.active_status
    FROM content
    JOIN text ON content.content_id = text.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE content.content_type_id = '3' AND content.active_status = 1
  `;

  const [results] = await database.query(query);
  return results;
};

async function checkIfTagExists(tagDescription) {
  const query = `
    SELECT * FROM tag WHERE description = ?;
  `;

  try {
    const [rows] = await database.query(query, [tagDescription]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking tag existence:", error);
    throw error;
  }
}

async function getContentByTag(tag) {
  const imageQuery = `
    SELECT 
      content.content_id,
      content.active_status,
      content.total_hits,
      content.created_date,
      content.last_hit,
      content.content_url,
      tag.description as image_tag,
      image.image_id,
      image.content_id as image_content_id,
      image.image_uuid
    FROM content
    JOIN image ON content.content_id = image.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE tag.description = ?;
  `;

  const textQuery = `
    SELECT 
      text.text_value,
      tag.description as text_tag,
      content.content_id,
      content.active_status,
      content.total_hits,
      content.created_date,
      content.last_hit,
      content.content_url
    FROM content
    JOIN text ON content.content_id = text.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE tag.description = ? AND content.content_type_id = 3;
  `;

  const linkQuery = `
    SELECT 
      link.original_url,
      content.content_id,
      content.active_status,
      content.total_hits,
      content.created_date,
      content.last_hit,
      content.content_url
    FROM link
    JOIN content ON link.content_id = content.content_id
    JOIN content_tag ON content.content_id = content_tag.content_id
    JOIN tag ON content_tag.tag_id = tag.tag_id
    WHERE tag.description = ? AND content.content_type_id = 1;
  `;

  const [images] = await database.query(imageQuery, [tag]);
  const [texts] = await database.query(textQuery, [tag]);
  const [links] = await database.query(linkQuery, [tag]);

  return { images, texts, links };
}

module.exports = {
  getUserImages,
  getUserLinks,
  getUserTexts,
  getDescriptions,
  shortenUrl,
  insertLink,
  insertContent,
  insertContentTag,
  insertImage,
  updateLinkHits,
  insertText,
  updateLink,
  getLinkById,
  getAllTags,
  checkShortenedUrlExistence,
  getContentByURL,
  getTextContentById,
  updateTextContentValues,
  getImageContentById,
  updateImageContentValues,
  updateImageContentValuesNoImage,
  deleteImage,
  deleteLink,
  deleteText,
  getTopImage,
  getTopLink,
  getTopText,
  getAllImages,
  getAllLinks,
  getAllTexts,
  checkIfTagExists,
  getContentByTag,
};
