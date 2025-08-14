const express = require("express");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Database
    const eliteClubDB = client.db("EliteClubDB");
    // Courts Collection
    const courtsCollection = eliteClubDB.collection("courts");
    // Booking Collection
    const bookingCourtsCollection = eliteClubDB.collection("bookings");
    // Users Collection
    const usersCollection = eliteClubDB.collection("users");
    // Announcements Collection
    const announcementsCollection = eliteClubDB.collection("announcements");
    // Coupons Collection
    const couponsCollection = eliteClubDB.collection("coupons");
    // Payments Collection
    const paymentsCollection = eliteClubDB.collection("payments");

    // Custom Middlewares verifyFirebaseToken
    const verifyFBToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).send({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
          return res.status(401).send({ message: "Unauthorized" });
        }

        // Verify The Token
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      } catch (error) {
        console.error("Error verifying Firebase token:", error);
        res.status(401).send({ message: "Unauthorized" });
      }
    };

    // Get Courts Data
    app.get("/courts", async (req, res) => {
      try {
        const result = await courtsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching courts data:", error);
        res.status(500).send({ message: "Failed to fetch courts data." });
      }
    });

    // Get All Users
    app.get("/all-users", verifyFBToken, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching users data:", error);
        res.status(500).send({ message: "Failed to fetch users data." });
      }
    });

    // Get Members
    app.get("/members", verifyFBToken, async (req, res) => {
      try {
        const result = await usersCollection.find({ role: "member" }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching members data:", error);
        res.status(500).send({ message: "Failed to fetch members data." });
      }
    });

    // GET User By Email
    app.get("/users", verifyFBToken, async (req, res) => {
      try {
        const email = req.query.email?.toLowerCase();

        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email query parameter is required",
          });
        }

        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        res.status(200).json({
          success: true,
          data: user,
        });
      } catch (error) {
        console.error("Error fetching user by email:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get Pending Booking Data By Email
    app.get("/bookings/pending", verifyFBToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;

        const pendingBookings = await bookingCourtsCollection
          .find({ status: "pending", email: userEmail })
          .toArray();

        res.send(pendingBookings);
      } catch (error) {
        console.error("Error fetching pending bookings:", error);
        res.status(500).send({ message: "Failed to fetch pending bookings." });
      }
    });

    // Get Pending Booking All Data
    app.get("/bookings/pending-all", verifyFBToken, async (req, res) => {
      try {
        const pendingBookings = await bookingCourtsCollection
          .find({ status: "pending" })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(pendingBookings);
      } catch (error) {
        console.error("Error fetching pending bookings:", error);
        res.status(500).send({ message: "Failed to fetch pending bookings." });
      }
    });

    // Get Approved Booking Data By Email
    app.get("/bookings/approved", verifyFBToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;

        const approvedBookings = await bookingCourtsCollection
          .find({ status: "approved", email: userEmail })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(approvedBookings);
      } catch (error) {
        console.error("Error fetching approved bookings:", error);
        res.status(500).send({ message: "Failed to fetch approved bookings." });
      }
    });

    // Get Confirmed Booking Data By Email
    app.get("/bookings/confirmed", verifyFBToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;

        const confirmedBookings = await bookingCourtsCollection
          .find({ status: "confirmed", email: userEmail })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(confirmedBookings);
      } catch (error) {
        console.error("Error fetching confirmed bookings:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch confirmed bookings." });
      }
    });

    // Get Confirmed Bookings All Data
    app.get("/bookings/confirmed-all", verifyFBToken, async (req, res) => {
      try {
        const confirmedBookings = await bookingCourtsCollection
          .find({ status: "confirmed" })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(confirmedBookings);
      } catch (error) {
        console.error("Error fetching confirmed bookings:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch confirmed bookings." });
      }
    });

    // Get Coupons Data without verifyFBToken
    app.get("/coupons", async (req, res) => {
      try {
        const coupons = await couponsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(coupons);
      } catch (err) {
        console.error("Error fetching coupons:", err);
        res.status(500).send({ message: "Failed to fetch coupons." });
      }
    });

    // Get Coupons Data
    app.get("/coupons", verifyFBToken, async (req, res) => {
      try {
        const coupons = await couponsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(coupons);
      } catch (err) {
        console.error("Error fetching coupons:", err);
        res.status(500).send({ message: "Failed to fetch coupons." });
      }
    });

    // Get Coupon validation Data (case-insensitive, discount as number)
    app.get("/coupons/validate", async (req, res) => {
      const { code } = req.query;
      if (!code)
        return res.status(400).json({ message: "Coupon code is required" });

      try {
        // Case-insensitive search using regex ^code$
        const coupon = await couponsCollection.findOne({
          coupon: { $regex: new RegExp(`^${code}$`, "i") },
        });

        if (!coupon)
          return res.status(404).json({ message: "Coupon not found" });

        res.json({
          coupon: coupon.coupon,
          discount: Number(coupon.discount), // ensure discount is a number
          description: coupon.description,
        });
      } catch (error) {
        console.error("Error validating coupon:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Get Announcements Data
    app.get("/announcements", async (req, res) => {
      try {
        const result = await announcementsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching announcements data:", error);
        res
          .status(500)
          .send({ message: "Failed to fetch announcements data." });
      }
    });

    // GET all payments (sorted by most recent)
    app.get("/payments", verifyFBToken, async (req, res) => {
      try {
        const userEmail = req.decoded.email;

        // Query payments only for this user
        const payments = await paymentsCollection
          .find({ email: userEmail })
          .sort({ createdAt: -1 })
          .toArray();

        res.json(payments);
      } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Post Coupons Data
    app.post("/coupons", verifyFBToken, async (req, res) => {
      const { coupon, discount, description } = req.body;

      try {
        const exists = await couponsCollection.findOne({ coupon });
        if (exists) {
          return res.status(400).send({ message: "Coupon already exists." });
        }

        const result = await couponsCollection.insertOne({
          coupon,
          discount,
          description,
        });
        res.status(201).send(result);
      } catch (err) {
        console.error("Error creating coupon:", err);
        res.status(500).send({ message: "Failed to create coupon." });
      }
    });

    // Post Courts Data
    app.post("/courts", verifyFBToken, async (req, res) => {
      try {
        const courtData = req.body;
        const result = await courtsCollection.insertOne(courtData);
        res.send(result);
      } catch (error) {
        console.error("Error creating court:", error);
        res.status(500).send({ message: "Failed to create court." });
      }
    });

    // POST Announcement Data
    app.post("/announcements", verifyFBToken, async (req, res) => {
      try {
        const { title, message } = req.body;
        if (!title || !message) {
          return res
            .status(400)
            .send({ message: "Title and message are required." });
        }

        const newAnnouncement = {
          title,
          message,
          createdAt: new Date().toISOString(),
        };

        const result = await announcementsCollection.insertOne(newAnnouncement);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).send({ message: "Failed to create announcement." });
      }
    });

    // Post Users Data
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        const email = userData.email;
        const userExists = await usersCollection.findOne({ email });

        // Check if user already exists don't save
        if (userExists) {
          return res.status(200).send({
            message: "User already exists",
            inserted: false,
          });
        }

        const result = await usersCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send({ message: "Failed to create user." });
      }
    });

    // Post Booking Data
    app.post("/bookings", verifyFBToken, async (req, res) => {
      try {
        const bookingData = req.body;
        const result = await bookingCourtsCollection.insertOne(bookingData);
        res.send(result);
      } catch (error) {
        console.error("Error booking courts:", error);
        res.status(500).send({ message: "Failed to book courts." });
      }
    });

    // Post Payment Data
    app.post("/payments", verifyFBToken, async (req, res) => {
      try {
        const paymentData = req.body;

        // Basic validation
        if (
          !paymentData.bookingId ||
          !paymentData.email ||
          paymentData.price == null
        ) {
          return res
            .status(400)
            .json({ message: "Missing required payment data" });
        }

        // Insert payment record
        const result = await paymentsCollection.insertOne({
          ...paymentData,
          createdAt: new Date().toISOString(),
        });

        // Also update booking status to "confirmed"
        await bookingCourtsCollection.updateOne(
          { _id: new ObjectId(paymentData.bookingId) },
          { $set: { status: "confirmed", paidAt: new Date().toISOString() } }
        );

        res.status(201).json({
          message: "Payment saved successfully",
          paymentId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving payment:", error);
        res.status(500).json({ message: "Failed to save payment" });
      }
    });

    // PATCH Courts Data By Id
    app.patch("/courts/:id", verifyFBToken, async (req, res) => {
      try {
        const courtId = req.params.id;
        const updatedCourt = req.body;

        const result = await courtsCollection.updateOne(
          { _id: new ObjectId(courtId) },
          { $set: updatedCourt }
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating court:", error);
        res.status(500).send({ message: "Failed to update court" });
      }
    });

    // PATCH Coupons Data By Id
    app.patch("/coupons/:id", verifyFBToken, async (req, res) => {
      const couponId = req.params.id;
      const { coupon, discount, description } = req.body;

      try {
        const result = await couponsCollection.updateOne(
          { _id: new ObjectId(couponId) },
          { $set: { coupon, discount, description } }
        );

        if (result.modifiedCount === 1) {
          res.send({ success: true, message: "Coupon updated successfully." });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Coupon not found." });
        }
      } catch (err) {
        console.error("Error updating coupon:", err);
        res.status(500).send({ message: "Failed to update coupon." });
      }
    });

    // PATCH For Update Announcement By Id
    app.patch("/announcements/:id", verifyFBToken, async (req, res) => {
      try {
        const announcementId = req.params.id;
        const { title, message } = req.body;

        if (!title || !message) {
          return res
            .status(400)
            .send({ message: "Title and message are required." });
        }

        const updateFields = { title, message };

        const result = await announcementsCollection.updateOne(
          { _id: new ObjectId(announcementId) },
          { $set: updateFields }
        );

        if (result.modifiedCount === 1) {
          res.send({
            success: true,
            message: "Announcement updated successfully.",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Announcement not found." });
        }
      } catch (error) {
        console.error("Error updating announcement:", error);
        res.status(500).send({ message: "Failed to update announcement." });
      }
    });

    // PATCH For Update Confirmed Booking By Id
    app.patch("/bookings/approve/:id", verifyFBToken, async (req, res) => {
      try {
        const bookingId = req.params.id;
        const { status, approvedAt, userEmail } = req.body;

        // Step 1: Update the booking status
        const bookingUpdate = await bookingCourtsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          {
            $set: {
              status,
            },
          }
        );

        // Step 2: Check user's current role
        const user = await usersCollection.findOne({ email: userEmail });

        let userUpdateResult = null;
        if (user && user.role !== "member") {
          // If not already a member, promote
          userUpdateResult = await usersCollection.updateOne(
            { email: userEmail },
            {
              $set: {
                role: "member",
                approvedAt,
              },
            }
          );
        }

        if (bookingUpdate.modifiedCount === 1) {
          res.send({
            success: true,
            message:
              user?.role === "member"
                ? "Booking approved. User already a member."
                : "Booking approved and user promoted to member.",
            userUpdated: userUpdateResult?.modifiedCount === 1,
          });
        } else {
          res.status(404).send({
            success: false,
            message: "Booking not found or not updated.",
          });
        }
      } catch (error) {
        console.error("Error approving booking:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to approve booking." });
      }
    });

    // Delete Booking Data By Id
    app.delete("/bookings/:id", verifyFBToken, async (req, res) => {
      try {
        const bookingId = req.params.id;
        const result = await bookingCourtsCollection.deleteOne({
          _id: new ObjectId(bookingId),
        });

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Booking deleted successfully" });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Booking not found" });
        }
      } catch (error) {
        console.error("Error deleting booking:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete booking" });
      }
    });

    // Delete Courts Data By Id
    app.delete("/courts/:id", verifyFBToken, async (req, res) => {
      try {
        const courtId = req.params.id;
        const result = await courtsCollection.deleteOne({
          _id: new ObjectId(courtId),
        });
        res.send(result);
      } catch (error) {
        console.error("Error deleting court:", error);
        res.status(500).send({ message: "Failed to delete court" });
      }
    });

    // Delete Coupons Data By Id
    app.delete("/coupons/:id", verifyFBToken, async (req, res) => {
      const couponId = req.params.id;

      try {
        const result = await couponsCollection.deleteOne({
          _id: new ObjectId(couponId),
        });

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Coupon deleted successfully." });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Coupon not found." });
        }
      } catch (err) {
        console.error("Error deleting coupon:", err);
        res.status(500).send({ message: "Failed to delete coupon." });
      }
    });

    // DELETE Announcement Data By Id
    app.delete("/announcements/:id", verifyFBToken, async (req, res) => {
      try {
        const announcementId = req.params.id;
        const result = await announcementsCollection.deleteOne({
          _id: new ObjectId(announcementId),
        });

        if (result.deletedCount === 1) {
          res.send({
            success: true,
            message: "Announcement deleted successfully.",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Announcement not found." });
        }
      } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).send({ message: "Failed to delete announcement." });
      }
    });

    // Delete Member From DB And Firebase
    app.delete("/members/:id", verifyFBToken, async (req, res) => {
      const userId = req.params.id;

      try {
        // Step 1: Find user by ID in MongoDB
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });

        if (!user) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        const userEmail = user.email;

        // Step 2: Fetch Firebase user by email to get UID
        let firebaseUid;
        try {
          const userRecord = await admin.auth().getUserByEmail(userEmail);
          firebaseUid = userRecord.uid;
        } catch (error) {
          console.warn(
            `Firebase user not found by email ${userEmail}, skipping Firebase deletion.`
          );
        }

        // Step 3: Delete user from MongoDB
        const userDeleteResult = await usersCollection.deleteOne({
          _id: new ObjectId(userId),
        });

        // Step 4: Delete bookings related to the user email
        const bookingDeleteResult = await bookingCourtsCollection.deleteMany({
          email: userEmail,
        });

        // Step 5: Delete Firebase user if UID found
        if (firebaseUid) {
          try {
            await admin.auth().deleteUser(firebaseUid);
          } catch (firebaseError) {
            console.error(
              `Failed to delete Firebase user ${firebaseUid}:`,
              firebaseError
            );
          }
        }

        res.send({
          success: true,
          message: "User and their bookings deleted successfully",
          deletedBookings: bookingDeleteResult.deletedCount,
        });
      } catch (error) {
        console.error("Error deleting user and bookings:", error);
        res.status(500).send({
          success: false,
          message: "Failed to delete member and bookings",
        });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Elite Club Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
