import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import "./SiteBanner.css";

const DISMISSED_KEY = "kt-site-banner-dismissed";
export default function SiteBanner() {
  const [banner,setBanner]=useState(null); const [visible,setVisible]=useState(false);
  useEffect(()=>{let active=true;apiFetch("/api/banner").then(({ok,data})=>{if(!active||!ok||!data?.success||!data.banner?.enabled||!data.banner?.imageUrl)return;setBanner(data.banner);try{if(sessionStorage.getItem(DISMISSED_KEY)!==data.banner.id)setVisible(true)}catch{setVisible(true)}});return()=>{active=false}},[]);
  if(!visible||!banner)return null;
  const close=()=>{setVisible(false);try{sessionStorage.setItem(DISMISSED_KEY,banner.id)}catch{}};
  return <div className="site-banner-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)close()}}><aside className="site-banner-modal" role="dialog" aria-modal="true" aria-label="Site announcement"><button type="button" className="site-banner-close" aria-label="Close announcement" onClick={close}>×</button><img src={banner.imageUrl} alt={banner.altText||banner.title||"Kuwarji Travels announcement"}/>{(banner.title||banner.message||banner.buttonText)&&<div className="site-banner-copy">{banner.title&&<h2>{banner.title}</h2>}{banner.message&&<p>{banner.message}</p>}{banner.buttonText&&banner.buttonUrl&&<a href={banner.buttonUrl}>{banner.buttonText} →</a>}</div>}</aside></div>;
}
