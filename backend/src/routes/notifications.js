const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { Notification } = require("../models/Notification");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
router.get("/", requireAuth, async (req,res)=>{
  try {
    await connectToDatabase();
    const rows = await Notification.find({ userId:req.session.userId }).sort({createdAt:-1}).limit(50).lean();
    const unreadCount = rows.filter(n=>!n.readAt && n.status !== "READ").length;
    return res.json({success:true, unreadCount, notifications: rows.map(n=>({id:n._id.toString(), title:n.title||"Update", message:n.message||n.body||"", readAt:n.readAt||null, createdAt:n.createdAt}))});
  } catch(err){ console.error("notifications list error",err); return res.status(500).json({success:false,error:"Failed to load notifications."}); }
});
router.patch("/:id/read", requireAuth, async (req,res)=>{
  try { await connectToDatabase(); const n=await Notification.findOneAndUpdate({_id:req.params.id,userId:req.session.userId},{$set:{readAt:new Date(),isRead:true}},{new:true}).lean(); if(!n)return res.status(404).json({success:false,error:"Notification not found."}); return res.json({success:true}); }
  catch(err){return res.status(500).json({success:false,error:"Failed to update notification."});}
});
module.exports=router;
