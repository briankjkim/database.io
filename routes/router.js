const router = require("express").Router();

// Database Connections
const database = include("databaseConnection");
const db_users = include("database/users");
const db_content = include("database/content");

// Session, MongoDB, Bcrypt, Salt, Crypto, uuid
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;
const { v4: uuid } = require("uuid");
const expireTime = 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

// Cloudinary
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

// Multer
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cstdatabase.azr5m5y.mongodb.net/?retryWrites=true&w=majority`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

router.use(
  session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true,
  })
);

router.use("/loggedin", sessionValidation);

router.use("/links", sessionValidation);

router.use("/text", sessionValidation);

router.use("/images", sessionValidation);

router.use("/editLink", sessionValidation);

router.use("/editText", sessionValidation);

router.use("/editImage", sessionValidation);

router.get("/", async (req, res) => {
  try {
    const topImage = await db_content.getTopImage();
    const topLink = await db_content.getTopLink();
    const topText = await db_content.getTopText();
    const images = await db_content.getAllImages();
    const links = await db_content.getAllLinks();
    const texts = await db_content.getAllTexts();

    // Shuffle the arrays to get random elements
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    shuffleArray(images);
    shuffleArray(links);
    shuffleArray(texts);

    if (req.session.username) {
      res.render("index", {
        username: req.session.username,
        isLoggedIn: true,
        topImage,
        topLink,
        topText,
        images,
        links,
        texts,
      });
    } else {
      res.render("index", {
        isLoggedIn: false,
        topImage,
        topLink,
        topText,
        images,
        links,
        texts,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/createTables", async (req, res) => {
  const create_tables = include("database/create_tables");

  const success = create_tables.createTables();
  if (success) {
    res.render("errorMessage", { error: "Created tables." });
  } else {
    res.render("errorMessage", { error: "Failed to create tables." });
  }
});

router.get("/showContent/:id", async (req, res) => {
  const content_url = req.params.id;
  console.log("\x1b[31m%s\x1b[0m", "content_url:", content_url);
  try {
    const content = await db_content.getContentByURL(content_url);
    console.log("HELLOE HEELO", content[0].active_status);
    if (content[0].active_status === 0) {
      res.render("errorMessage", {
        error: "THIS CONTENT IS BLOCKED",
      });
      return;
    }
    db_content.updateLinkHits(content[0].content_id);
    console.log("\x1b[31m%s\x1b[0m", "content:", content);
    if (content[0].content_type_id === 1) {
      res.redirect(content[0].original_url);
    } else {
      res.render("showContentURL", {
        isLoggedIn: req.session.username ? true : false,
        content: content,
      });
      return;
    }
  } catch (error) {
    console.error("Error fetching content in show content:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching show content.",
    });
    return;
  }
});

router.get("/links", async (req, res) => {
  try {
    const userId = await db_users.getUserByEmail({ email: req.session.email });
    const links = await db_content.getUserLinks(userId[0].user_id);
    res.render("linksContent", {
      isLoggedIn: req.session.username ? true : false,
      links: links,
    });
  } catch (error) {
    console.error("Error fetching user links:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching user links.",
    });
  }
});

router.post("/processLink", async (req, res) => {
  const link = req.body.link;
  const linkTag = req.body.linkTag;
  // console.log("we INSERT", link, shortenedUrl, linkTag, contentId, contentTypeId)
  const results = await db_users.getUserByEmail({ email: req.session.email });

  try {
    const contentTypeId = 1;
    const shortenedUrl = await db_content.shortenUrl(link);
    console.log("\x1b[31m%s\x1b[0m", "processLink: shortendURL", shortenedUrl);

    const contentID = await db_content.insertContent(
      contentTypeId,
      results[0].user_id,
      1,
      0,
      new Date(),
      0,
      shortenedUrl
    );

    console.log("\x1b[31m%s\x1b[0m", "Content ID", contentID);

    const lastInsertId = contentID;

    await db_content.insertLink(lastInsertId, link);

    await db_content.insertContentTag(linkTag, lastInsertId);

    res.redirect("/links");
  } catch (error) {
    console.error("Error inserting link:", error);
    res.render("errorMessage", {
      error: "An error occurred while inserting the link.",
    });
  }
});

router.get("/images", async (req, res) => {
  try {
    const userId = await db_users.getUserByEmail({ email: req.session.email });
    const images = await db_content.getUserImages(userId[0].user_id);
    console.log("ITS A DUB", images);
    res.render("imageContent", {
      isLoggedIn: req.session.username ? true : false,
      images: images,
    });
  } catch (error) {
    console.error("error fetching user image", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching user image",
    });
  }
});

// Image post route uses Cloudinary service
router.post(
  "/imageUpload",
  upload.single("image"),
  async function (req, res, next) {
    // Create image_uuid object for image reference
    let image_uuid = uuid();

    const hashed_uuid = await db_content.shortenUrl(image_uuid);
    // console.log("\x1b[31m%s\x1b[0m", "hashed_uuid", hashed_uuid);

    // Set Content Type id
    const contentTypeId = 2;

    // Find User information with Email
    const userResult = await db_users.getUserByEmail({
      email: req.session.email,
    });
    let user_id = userResult[0].user_id;

    // Cloudinary Uploading
    let buf64 = req.file.buffer.toString("base64");
    stream = cloudinary.uploader.upload(
      "data:image/octet-stream;base64," + buf64,
      async function (result) {
        try {
          const contentID = await db_content.insertContent(
            contentTypeId,
            user_id,
            1,
            0,
            new Date(),
            0,
            hashed_uuid
          );
          // console.log("\x1b[31m%s\x1b[0m", "contentID", contentID);

          const resultImageUpload = await db_content.insertImage(
            contentID,
            image_uuid
          );

          const tag_id = req.body["descriptionId"];
          // console.log("\x1b[31m%s\x1b[0m", "TAG ID", tag_id);

          const resultContentTag = await db_content.insertContentTag(
            tag_id,
            contentID
          );

          console.log(
            "\x1b[31m%s\x1b[0m",
            "image upload result: ",
            resultImageUpload
          );
          console.log(
            "\x1b[31m%s\x1b[0m",
            "content tag result: ",
            resultContentTag
          );
          console.log(result);

          res.redirect("/images");
        } catch (ex) {
          res.render("error", {
            message: "Error connecting to Database and uploading to Cloudinary",
          });
          console.log("\x1b[31m%s\x1b[0m", "Error Image Upload");
          console.log(ex);
        }
      },
      { public_id: image_uuid }
    );
    console.log("\x1b[31m%s\x1b[0m", "req.body", req.body);
    console.log("\x1b[31m%s\x1b[0m", "req.file", req.file);
    res.redirect("/images");
  }
);

router.get("/descriptions", async (req, res) => {
  try {
    const descriptions = await db_content.getDescriptions();
    res.json(descriptions);
  } catch (error) {
    console.error("Error fetching descriptions:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching descriptions." });
  }
});

router.get("/text", async (req, res) => {
  try {
    const userId = await db_users.getUserByEmail({ email: req.session.email });
    const userTexts = await db_content.getUserTexts(userId[0].user_id);
    res.render("textContent", {
      isLoggedIn: req.session.username ? true : false,
      texts: userTexts,
    });
  } catch (error) {
    console.error("Error fetching user texts:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching user texts.",
    });
  }
});

router.post("/textUpload", async (req, res) => {
  const text = req.body.text;
  const tagID = req.body.tag_id;

  // console.log("\x1b[31m%s\x1b[0m", "text", text);
  // console.log("\x1b[31m%s\x1b[0m", "tagID", tagID);
  // console.log("\x1b[31m%s\x1b[0m", "req.body", req.body);
  // console.log("\x1b[31m%s\x1b[0m", "req.headers", req.headers);

  const userResult = await db_users.getUserByEmail({
    email: req.session.email,
  });

  console.log("\x1b[31m%s\x1b[0m", "userResult from Text", userResult);

  const textIDforHashing = uuid();
  const contentURL = await db_content.shortenUrl(textIDforHashing);

  console.log("\x1b[31m%s\x1b[0m", "hashedText", contentURL);

  try {
    const contentTypeId = 3;

    const contentID = await db_content.insertContent(
      contentTypeId,
      userResult[0].user_id,
      1,
      0,
      new Date(),
      0,
      contentURL
    );

    console.log("ContentID from /textUpload", contentID);

    const lastInsertId = contentID;

    await db_content.insertText(lastInsertId, text);
    await db_content.insertContentTag(tagID, lastInsertId);

    res.redirect("/text");
  } catch (error) {
    console.error("Error inserting text:", error);
    res.render("errorMessage", {
      error: "An error occurred while inserting the text.",
    });
  }
});

function validatePassword(password) {
  const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
  const isValid = regex.test(password);
  console.log(`Password: ${password}, IsValid: ${isValid}`);
  return isValid;
}

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!email) {
    return res.redirect(`/signup?missing=1`);
  }
  if (!username) {
    return res.redirect(`/signup?missing=2`);
  }
  if (!password) {
    return res.redirect(`/signup?missing=3`);
  }

  if (!validatePassword(password)) {
    return res.redirect(`/signup?invalidPassword=4`);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user_type_id = 2;

    const success = await db_users.createUser({
      username,
      email,
      password: hashedPassword,
      user_type_id,
    });

    if (success) {
      return res.redirect("/");
    } else {
      res.render("errorMessage", { error: "Failed to create user." });
    }
  } catch (err) {
    console.log(err);
    res.render("errorMessage", { error: "An error occurred." });
  }
});

router.get("/signup", (req, res) => {
  var missingEmail = req.query.missing === "1";
  var missingUsername = req.query.missing === "2";
  var missingPassword = req.query.missing === "3";
  var invalidPassword = req.query.invalidPassword === "4";
  res.render("signup", {
    missingEmail,
    missingUsername,
    missingPassword,
    invalidPassword,
  });
});

router.get("/login", (req, res) => {
  var missingEmail = req.query.missing;
  var missingPassword = req.query.missing;
  var IncorrectPassword = req.query.missing;
  res.render("login", { missingEmail, missingPassword, IncorrectPassword });
});

function isValidSession(req) {
  if (req.session.username) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  console.log(req.session);
  if (!isValidSession(req)) {
    req.session.destroy();
    return res.redirect("/");
  } else {
    next();
  }
}

router.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var username = req.body.username;

  if (!email) {
    return res.redirect("/login?missing=1");
  }
  if (!password) {
    return res.redirect("/login?missing=2");
  }

  var results = await db_users.getUserByEmail({ email });

  if (results) {
    if (results.length == 1) {
      if (bcrypt.compareSync(password, results[0].password)) {
        req.session.authenticated = true;
        req.session.email = email;
        req.session.username = results[0].username;
        req.session.cookie.maxAge = expireTime;
        req.session.user_type_id = results[0].user_type_id;
        req.session.id = results[0].user_id;
        res.redirect("/loggedin");
        return;
      } else {
        return res.redirect("/login?missing=3");
      }
    } else {
      console.log(
        "invalid number of users matched: " + results.length + " (expected 1)."
      );
      res.redirect("/login");
      return;
    }
  }

  console.log("user not found");
  res.redirect("/login");
});


router.get("/loggedin", (req, res) => {
  if (req.session.user_type_id === 1) {
    res.redirect("/");
  } else if (req.session.user_type_id === 2) {
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

router.get("/userLinks", async (req, res) => {
  try {
    const userLinks = await db_content.getUserLinks(req.session.user_id);
    res.render("userLinks", { userLinks });
  } catch (error) {
    console.error("Error fetching user links:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching user links.",
    });
  }
});

router.get("/userTexts", async (req, res) => {
  try {
    const userTexts = await db_content.getUserTexts(req.session.user_id);
    res.render("userTexts", { userTexts });
  } catch (error) {
    console.error("Error fetching user texts:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching user texts.",
    });
  }
});

router.post("/updateActiveStatus", upload.none(), async (req, res, next) => {
  const contentId = req.body.content_id;
  console.log("/updateActiveStatus", contentId);
  try {
    // Fetch the current active_status from the database
    const [rows] = await database.query(
      "SELECT active_status FROM content WHERE content_id = ?",
      [contentId]
    );
    const currentActiveStatus = rows[0].active_status;
    console.log("what the fuck is this?! bs", rows[0].active_status);

    // Toggle the active_status
    const newActiveStatus = currentActiveStatus === 1 ? 0 : 1;

    // Update the active_status in the database
    await database.query(
      "UPDATE content SET active_status = ? WHERE content_id = ?",
      [newActiveStatus, contentId]
    );

    res.json({ success: true, newActiveStatus });
  } catch (error) {
    console.error("Error updating active status:", error);
    res.json({ success: false, error: "Error updating active status" });
  }
});

router.post("/updateLink", async (req, res) => {
  try {
    const contentId = req.body.contentId;
    const originalUrl = req.body.originalUrl;
    const shortenedUrl = req.body.shortenedUrl;
    const linkTag = req.body.linkTag;
    const activeStatus = req.body.activeStatus ? 1 : 0;
    const existingLink = await db_content.checkShortenedUrlExistence(
      shortenedUrl
    );

    if (existingLink && existingLink.content_id !== contentId) {
      const errorMessage = "Shortened URL already exists";
      return res.redirect(`/editLink/${contentId}?error=${errorMessage}`);
    }

    console.log(
      "TEST DOG",
      contentId,
      originalUrl,
      shortenedUrl,
      linkTag,
      activeStatus
    );

    await db_content.updateLink(
      contentId,
      originalUrl,
      shortenedUrl,
      linkTag,
      activeStatus
    );

    return res.redirect("/links");
  } catch (error) {
    console.error("Error updating link hits:", error);
    res.json({ success: false });
    console.error("Error updating link:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/editLink/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;

    const link = await db_content.getLinkById(contentId);

    const tags = await db_content.getAllTags();

    res.render("editContent", {
      isLoggedIn: req.session.username ? true : false,
      link: link,
      req: req,
      tags: tags,
    });
  } catch (error) {
    console.error("Error fetching link for editing:", error);
    res.render("errorMessage", {
      error: "An error occurred while fetching link for editing.",
    });
  }
});

router.get("/editText/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const textContent = await db_content.getTextContentById(contentId);

    const tags = await db_content.getAllTags();

    if (textContent) {
      res.render("editText", {
        isLoggedIn: req.session.username ? true : false,
        textContent: textContent,
        req: req,
        tags: tags,
      });
    } else {
      res.status(404).send("Text Content not found");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/updateText", async (req, res) => {
  try {
    const contentId = req.body.contentId;
    const editedTextValue = req.body.text_value;
    const editedTextTag = req.body.textTag;
    const editedContentUrl = req.body.shortenedUrl;
    const editedActiveStatus = req.body.activeStatus ? 1 : 0;

    const existingText = await db_content.checkShortenedUrlExistence(
      editedContentUrl
    );

    if (existingText && existingText.content_id !== contentId) {
      const errorMessage = "Shortened URL already exists";
      return res.redirect(`/editText/${contentId}?error=${errorMessage}`);
    }

    await db_content.updateTextContentValues(
      contentId,
      editedTextValue,
      editedTextTag,
      editedContentUrl,
      editedActiveStatus
    );

    // Redirect back to the view page for text content
    res.redirect("/text");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/editImage/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const imageContent = await db_content.getImageContentById(contentId);

    const tags = await db_content.getAllTags();

    if (imageContent) {
      res.render("editImage", {
        isLoggedIn: req.session.username ? true : false,
        Image: imageContent,
        req: req,
        tags: tags,
      });
    } else {
      res.status(404).send("image Content not found");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/deleteImage/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;

    await db_content.deleteImage(contentId);

    res.redirect("/images");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/deleteLink/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;

    await db_content.deleteLink(contentId);

    res.redirect("/links");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/deleteText/:contentId", async (req, res) => {
  try {
    const contentId = req.params.contentId;

    await db_content.deleteText(contentId);

    res.redirect("/text");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/updateImage", upload.single("image"), async (req, res, next) => {
  let image_uuid = uuid();

  try {
    const contentId = req.body.content_id;
    const editedTextTag = req.body.imageTag;
    const editedContentUrl = req.body.shortenedUrl;
    const editedActiveStatus = req.body.activeStatus ? 1 : 0;

    const existingImage = await db_content.checkShortenedUrlExistence(
      editedContentUrl
    );

    if (existingImage && existingImage.content_id !== contentId) {
      const errorMessage = "Shortened URL already exists";
      return res.redirect(`/editImage/${contentId}?error=${errorMessage}`);
    }
    console.log("file check", req.file);
    if (req.file) {
      let buf64 = req.file.buffer.toString("base64");
      stream = cloudinary.uploader.upload(
        "data:image/octet-stream;base64," + buf64,
        async function (result) {
          try {
            const query = await db_content.updateImageContentValues(
              contentId,
              image_uuid,
              editedTextTag,
              editedContentUrl,
              editedActiveStatus
            );
            console.log("update Image result", result);
            console.log("Result of Image query", query);
            res.redirect("/images");
            return;
          } catch (ex) {
            res.render("errorMessage", {
              error:
                "Error connecting to Database and uploading to Cloudinary " +
                ex,
            });
            console.log("\x1b[31m%s\x1b[0m", "Error Image Upload");
            console.log(ex);
            return;
          }
        },
        { public_id: image_uuid }
      );
    } else {
      // Update the backend database status
      console.log("Update Image with no file change");
      try {
        const query = await db_content.updateImageContentValuesNoImage(
          contentId,
          editedTextTag,
          editedContentUrl,
          editedActiveStatus
        );
        console.log("Result of Image Update query without image change", query);
        res.redirect("/images");
        return;
      } catch (ex) {
        res.render("errorMessage", {
          error: "Error updating image with no file change " + ex,
        });
        console.log("\x1b[31m%s\x1b[0m", "Error Image Update with no Image");
        console.log(ex);
        return;
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/checkTag", async (req, res) => {
  const search = req.query.search;
  console.log(search);

  try {
    const tagExists = await db_content.checkIfTagExists(search);

    res.json({ tagFound: tagExists });
  } catch (error) {
    console.error("Error checking tag:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/tags/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;
    const content = await db_content.getContentByTag(tag);

    if (req.session.username) {
      res.render("tags", {
        isLoggedIn: true,
        content,
        tag: tag,
      });
    } else {
      res.render("tags", {
        isLoggedIn: false,
        content,
        tag,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

module.exports = router;
