import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { instance } from "../server.js";
import crypto from "crypto";
// Placing User Order for Frontend
const placeOrder = async (req, res) => {
  try {
    const options = {
      amount: Number(req.body.amount) * 100, // amount in the smallest currency unit
      currency: "INR",
    };
    const order = await instance.orders.create(options);

    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
      orderId: order.id,
    });
    await newOrder.save();

    res.json({ success: true, order });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Listing Order for Admin panel
const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// User Orders for Frontend
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const updateStatus = async (req, res) => {
  console.log(req.body);
  try {
    await orderModel.findByIdAndUpdate(req.body.orderId, {
      status: req.body.status,
    });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    res.json({ success: false, message: "Error" });
  }
};

const verifyOrder = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;
    const order = await orderModel.findOne({ orderId: razorpay_order_id });
    if (isAuthentic) {
      await orderModel.findByIdAndUpdate(order._id, {
        payment: true,
      });
      await userModel.findOneAndUpdate(
        { _id: order.userId },
        { cartData: {} },
        { useFindAndModify: false }
      );
      res.redirect(`https://the-kadiyan-table-fontend.vercel.app/myorders`);
    } else {
      await orderModel.findByIdAndDelete(order._id);
      res.json({ success: false, message: "Not Paid" });
    }
  } catch (error) {
    const order = await orderModel.findOne({ orderId: razorpay_order_id });
    await orderModel.findByIdAndDelete(order._id);
    res.json({ success: false, message: "Not  Verified" });
  }
};

const cancelPayment = async (req, res) => {
  const { orderId } = req.body;
  try {
    const result = await orderModel.deleteOne({ orderId: orderId });
    if (result.deletedCount > 0) {
      res
        .status(200)
        .send({ success: true, message: "Order deleted successfully" });
    } else {
      res.status(404).send({ success: false, message: "Order not found" });
    }
  } catch (error) {}
};

export {
  placeOrder,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  cancelPayment,
};
