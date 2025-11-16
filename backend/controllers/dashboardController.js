//controllers\dashboardController.js
import User from "../models/User.js";
import Ad from "../models/Ad.js";
import Order from "../models/Order.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    // Optimize multiple queries into parallel execution
    const [totalUsers, totalAds, totalOrders, pendingOrders, pendingAds] =
      await Promise.all([
        User.countDocuments(),
        Ad.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ status: "Pending" }),
        Ad.countDocuments({ status: "pending" })
      ]);
    res.json({ totalUsers, totalAds, totalOrders, pendingOrders, pendingAds });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard data", error });
  }
};

export const getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    // Optimize multiple queries into parallel execution
    const [totalAds, totalOrders, pendingOrders] = await Promise.all([
      Ad.countDocuments({ user: userId }),
      Order.countDocuments({ exporter: userId }),
      Order.countDocuments({ exporter: userId, status: "Pending" })
    ]);
    res.json({ totalAds, totalOrders, pendingOrders });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user dashboard data", error });
  }
};
