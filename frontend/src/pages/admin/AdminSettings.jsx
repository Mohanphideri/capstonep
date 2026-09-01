import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

export const SETTINGS_SECTIONS = {
  business: { title: "Business Profile", lead: "Manage business identity, contact details, logo and tax information." },
  invoice: { title: "Authorized Signatory", lead: "Manage the official signatory identity and signature used on generated PDFs." },
  banner: { title: "Announcement Banner", lead: "Upload and manage the landing-page popup announcement." },
  fleetGallery: { title: "Fleet Gallery", lead: "Upload standalone bus and vehicle photos for the public fleet gallery." },
};

function emptyForm() {
  return {
    businessName: "", address: "", phone: "", email: "", whatsappNumber: "", logoUrl: "",
    currency: "INR", gstNumber: "", gstApplicable: false,
    cancellationPolicyText: "", refundPolicyText: "", termsText: "", privacyPolicyText: "", cookiePolicyText: "", bookingPolicyText: "",
    signatureUrl: "", signatoryFullName: "", signatoryDesignation: "", signatoryDepartment: "", signatoryEmail: "", signatoryPhone: "", signatoryActive: true, signatoryDefault: true,
    bannerEnabled: false, bannerId: "", bannerImageUrl: "", bannerTitle: "", bannerMessage: "", bannerButtonText: "", bannerButtonUrl: "", bannerAltText: "",
    fleetGallery: [],
  };
}

function toForm(s = {}) {
  return {
    ...emptyForm(),
    businessName: s.businessName || "", address: s.address || "", phone: s.phone || "", email: s.email || "", whatsappNumber: s.whatsappNumber || "", logoUrl: s.logoUrl || "",
    currency: s.currency || "INR",
    gstNumber: s.gst?.number || "", gstApplicable: !!s.gst?.applicable,
    cancellationPolicyText: s.cancellationPolicyText || "", refundPolicyText: s.refundPolicyText || "", termsText: s.termsText || "", privacyPolicyText: s.privacyPolicyText || "", cookiePolicyText: s.cookiePolicyText || "", bookingPolicyText: s.bookingPolicyText || "",
    signatureUrl: s.signatureUrl || "", signatoryFullName: s.authorizedSignatory?.fullName || "", signatoryDesignation: s.authorizedSignatory?.designation || "", signatoryDepartment: s.authorizedSignatory?.department || "", signatoryEmail: s.authorizedSignatory?.email || "", signatoryPhone: s.authorizedSignatory?.phone || "", signatoryActive: s.authorizedSignatory?.active !== false, signatoryDefault: s.authorizedSignatory?.isDefault !== false, bannerEnabled: !!s.banner?.enabled, bannerId: s.banner?.id || "", bannerImageUrl: s.banner?.imageUrl || "", bannerTitle: s.banner?.title || "", bannerMessage: s.banner?.message || "", bannerButtonText: s.banner?.buttonText || "", bannerButtonUrl: s.banner?.buttonUrl || "", bannerAltText: s.banner?.altText || "",
    fleetGallery: Array.isArray(s.fleetGallery) ? s.fleetGallery : [],
  };
}

function toPayload(f) {
  return {
    businessName: f.businessName.trim(), address: f.address.trim(), phone: f.phone.trim(), email: f.email.trim(), whatsappNumber: f.whatsappNumber.trim(),
    currency: f.currency.trim(),
    gst: { number: f.gstNumber.trim() || null, applicable: f.gstApplicable },
    cancellationPolicyText: f.cancellationPolicyText.trim(), refundPolicyText: f.refundPolicyText.trim(), termsText: f.termsText.trim(), privacyPolicyText: f.privacyPolicyText.trim(), cookiePolicyText: f.cookiePolicyText.trim(), bookingPolicyText: f.bookingPolicyText.trim(),
    authorizedSignatory: { fullName: f.signatoryFullName.trim(), designation: f.signatoryDesignation.trim(), department: f.signatoryDepartment.trim(), email: f.signatoryEmail.trim(), phone: f.signatoryPhone.trim(), active: !!f.signatoryActive, isDefault: !!f.signatoryDefault },
    banner: { id: f.bannerId || undefined, enabled: !!f.bannerEnabled, imageUrl: f.bannerImageUrl || null, title: f.bannerTitle.trim(), message: f.bannerMessage.trim(), buttonText: f.bannerButtonText.trim(), buttonUrl: f.bannerButtonUrl.trim(), altText: f.bannerAltText.trim() },
  };
}

function Field({ label, id, children }) { return <div className="admin-form-field"><label className="otp-label-text" htmlFor={id}>{label}</label>{children}</div>; }
function SettingsCard({ children, saveError, saved, saving, onSubmit }) { return <form className="ticket admin-table-card" onSubmit={onSubmit}>{saveError && <p className="otp-error">{saveError}</p>}{saved && <p className="admin-subtext">Settings saved.</p>}{children}<div className="admin-form-actions"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button></div></form>; }
function SettingsCardContent({ title, description, children }) { return <><p className="eyebrow">{title}</p><p className="admin-subtext">{description}</p><div style={{ marginTop: "1.25rem" }}>{children}</div></>; }

function BusinessSection({ form, set, ...props }) { return <SettingsCardContent title="Business profile" description="The information customers see when they contact or book with you."><div className="admin-form-grid"><Field label="Business name" id="s-name"><input id="s-name" className="admin-input" value={form.businessName} onChange={set("businessName")} /></Field><Field label="Currency" id="s-currency"><input id="s-currency" className="admin-input" value={form.currency} onChange={set("currency")} /></Field><Field label="Phone" id="s-phone"><input id="s-phone" className="admin-input" value={form.phone} onChange={set("phone")} /></Field><Field label="Email" id="s-email"><input id="s-email" className="admin-input" value={form.email} onChange={set("email")} /></Field><Field label="GST number" id="s-gst-number"><input id="s-gst-number" className="admin-input" value={form.gstNumber} onChange={set("gstNumber")} /></Field></div><Field label="Address" id="s-address"><textarea id="s-address" rows={3} className="admin-textarea" value={form.address} onChange={set("address")} /></Field><UploadCard label="Brand logo" help="Upload your own Kuwarji Travels logo. PNG with transparent background is recommended." aspect="Transparent PNG · max 5MB" inputId="s-logo" url={form.logoUrl} message={props.logoMessage} uploading={props.logoUploading} onUpload={props.handleLogoUpload} onRemove={props.removeLogo} alt="Kuwarji Travels logo" /><label className="admin-checkbox-item"><input type="checkbox" checked={form.gstApplicable} onChange={set("gstApplicable")} /><span>GST applicable on invoices</span></label></SettingsCardContent>; }
function UploadCard({ label, help, inputId, url, message, uploading, onUpload, onRemove, alt = "Uploaded image", aspect = "Recommended image" }) {
  const [dragging, setDragging] = useState(false);
  const choose = (files) => {
    const file = files?.[0];
    if (!file || uploading) return;
    onUpload({ target: { files: [file], value: "" } });
  };
  return <div className={`admin-image-uploader${dragging ? " is-dragging" : ""}`}>
    <div className="admin-image-uploader-head">
      <div><label className="otp-label-text" htmlFor={inputId}>{label}</label><p className="admin-subtext">{help}</p></div>
      {url && <span className="admin-image-state">Uploaded</span>}
    </div>
    <div className="admin-image-uploader-body">
      <label className="admin-image-dropzone" htmlFor={inputId} onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files)}}>
        <span className="admin-image-drop-icon">↑</span>
        <strong>{uploading ? "Uploading image…" : "Choose image or drag it here"}</strong>
        <small>PNG, JPG or WEBP · {aspect}</small>
      </label>
      <input id={inputId} className="admin-image-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} disabled={uploading} />
      <div className={`admin-image-preview${url ? " has-image" : ""}`}>
        {url ? <><img src={url} alt={alt} /><div className="admin-image-preview-meta"><span>Live preview</span><button type="button" className="btn btn-outline btn-sm" onClick={onRemove} disabled={uploading}>Remove</button></div></> : <div className="admin-image-empty"><span>Preview</span><small>Your uploaded image will appear here.</small></div>}
      </div>
    </div>
    {message && <p className="admin-image-message">{message}</p>}
  </div>;
}
function InvoiceSection({ form, set, ...props }) { return <SettingsCardContent title="Authorized signatory" description="This identity and signature are automatically fetched for new applicable PDFs. Previously generated PDFs remain unchanged.">
  <div className="admin-signatory-card">
    <div className="admin-signatory-grid">
      <Field label="Full name" id="s-signatory-name"><input id="s-signatory-name" className="admin-input" value={form.signatoryFullName} onChange={set("signatoryFullName")} placeholder="e.g. Raj Kumar" /></Field>
      <Field label="Designation" id="s-signatory-designation"><input id="s-signatory-designation" className="admin-input" value={form.signatoryDesignation} onChange={set("signatoryDesignation")} placeholder="e.g. Managing Director" /></Field>
      <Field label="Department (optional)" id="s-signatory-department"><input id="s-signatory-department" className="admin-input" value={form.signatoryDepartment} onChange={set("signatoryDepartment")} /></Field>
      <Field label="Email (optional)" id="s-signatory-email"><input id="s-signatory-email" type="email" className="admin-input" value={form.signatoryEmail} onChange={set("signatoryEmail")} /></Field>
      <Field label="Phone (optional)" id="s-signatory-phone"><input id="s-signatory-phone" className="admin-input" value={form.signatoryPhone} onChange={set("signatoryPhone")} /></Field>
    </div>
    <div className="admin-signatory-status-row">
      <label className="admin-checkbox-item"><input type="checkbox" checked={form.signatoryActive} onChange={set("signatoryActive")} /> <span>Active authorized signatory</span></label>
      <label className="admin-checkbox-item"><input type="checkbox" checked={form.signatoryDefault} onChange={set("signatoryDefault")} disabled={!form.signatoryActive} /> <span>Default signatory for new PDFs</span></label>
    </div>
    <UploadCard {...props} label="Signature image" help="PNG is recommended for transparent signatures. JPG/WEBP are also accepted." aspect="Transparent signature · max 5MB" inputId="s-signature" alt="Authorized signatory signature" />
    <div className="admin-signatory-note"><strong>PDF behavior:</strong> new PDFs fetch the active/default signatory automatically. If none is configured, no fake name or signature is inserted.</div>
  </div>
</SettingsCardContent>; }
function BannerSection({ form, set, ...props }) { return <SettingsCardContent title="Landing-page popup banner" description="The uploaded banner opens as a centered popup over the landing page. Visitors can close it with X."><div className="admin-form-grid"><Field label="Banner title" id="s-banner-title"><input id="s-banner-title" className="admin-input" value={form.bannerTitle} onChange={set("bannerTitle")} /></Field><Field label="Image alt text" id="s-banner-alt"><input id="s-banner-alt" className="admin-input" value={form.bannerAltText} onChange={set("bannerAltText")} /></Field><Field label="Button text" id="s-banner-button"><input id="s-banner-button" className="admin-input" value={form.bannerButtonText} onChange={set("bannerButtonText")} /></Field><Field label="Button URL" id="s-banner-url"><input id="s-banner-url" className="admin-input" value={form.bannerButtonUrl} onChange={set("bannerButtonUrl")} placeholder="/vehicles" /></Field></div><Field label="Banner message" id="s-banner-message"><textarea id="s-banner-message" rows={3} className="admin-textarea" value={form.bannerMessage} onChange={set("bannerMessage")} /></Field><label className="admin-checkbox-item"><input type="checkbox" checked={form.bannerEnabled} onChange={set("bannerEnabled")} /><span>Show popup on landing page</span></label><UploadCard {...props} label="Banner image" help="Use a clean, wide promotional image for the landing popup." aspect="16:9 recommended" inputId="s-banner-upload" url={form.bannerImageUrl} alt={form.bannerAltText || "Banner preview"} /></SettingsCardContent>; }

function FleetGallerySection({ form, ...props }) { return <SettingsCardContent title="Fleet gallery photos" description="These photos are independent from vehicle booking records. Upload only the bus/vehicle photos you want customers to see in the gallery."><UploadCard label="Add fleet photo" help="PNG/JPG/WEBP. Maximum 8MB per photo." inputId="fleet-upload" message={props.fleetMessage} uploading={props.fleetUploading} onUpload={props.handleFleetUpload} url="" /><div className="admin-fleet-grid">{form.fleetGallery.map((photo) => <div className="admin-fleet-item" key={photo.id}><img src={photo.imageUrl} alt={photo.altText || "Fleet"} /><button type="button" className="btn btn-outline btn-sm" onClick={() => props.removeFleet(photo.id)}>Remove</button></div>)}</div></SettingsCardContent>; }
export default function AdminSettings({ section = "business" }) {
  const active = SETTINGS_SECTIONS[section] ? section : "business"; const meta = SETTINGS_SECTIONS[active];
  const [form, setForm] = useState(emptyForm()); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState(null); const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState({}); const [messages, setMessages] = useState({}); const [fleetCategoryId, setFleetCategoryId] = useState(""); const [fleetCategories, setFleetCategories] = useState([]);
  const load = useCallback(async () => { setLoading(true); const [settingsResult, categoryResult] = await Promise.all([apiFetch("/api/admin/settings"), apiFetch("/api/vehicles/categories")]); if (settingsResult.ok && settingsResult.data?.success) setForm(toForm(settingsResult.data.settings)); else setError(settingsResult.data?.error || "Failed to load settings."); if (categoryResult.ok && categoryResult.data?.success) setFleetCategories(categoryResult.data.categories || []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]); useEffect(() => { setSaved(false); setSaveError(null); }, [active]);
  function set(field) { return (e) => { const value = e.target.type === "checkbox" ? e.target.checked : e.target.value; setForm((f) => ({ ...f, [field]: value })); setSaved(false); }; }
  async function uploadImage(path, file, max, key, extra = {}) { if (!file) return; if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return setMessages((m) => ({ ...m, [key]: "Upload PNG, JPG or WEBP." })); if (file.size > max) return setMessages((m) => ({ ...m, [key]: `Image must be ${Math.round(max / 1024 / 1024)}MB or smaller.` })); setUploading((u) => ({ ...u, [key]: true })); setMessages((m) => ({ ...m, [key]: "Uploading…" })); try { const dataBase64 = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); const { ok, data } = await apiFetch(path, { method: "POST", body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64, ...extra }) }); if (!ok || !data?.success) throw new Error(data?.error || "Upload failed."); return data; } catch (e) { setMessages((m) => ({ ...m, [key]: e.message })); return null; } finally { setUploading((u) => ({ ...u, [key]: false })); } }
  async function handleSignatureUpload(e) { const f=e.target.files?.[0]; e.target.value=""; const data=await uploadImage("/api/admin/settings/signature",f,5*1024*1024,"signature"); if(data?.signatureUrl) { setForm((x)=>({...x,signatureUrl:data.signatureUrl})); setMessages((m)=>({...m,signature:"Signature uploaded."})); } }
  async function removeSignature() { const {ok}=await apiFetch("/api/admin/settings/signature",{method:"DELETE"}); if(ok)setForm((x)=>({...x,signatureUrl:""})); }
  async function handleLogoUpload(e){const f=e.target.files?.[0];e.target.value="";const data=await uploadImage("/api/admin/settings/logo",f,5*1024*1024,"logo");if(data?.logoUrl)setForm((x)=>({...x,logoUrl:data.logoUrl}));}
  async function removeLogo(){const {ok}=await apiFetch("/api/admin/settings/logo",{method:"DELETE"});if(ok)setForm((x)=>({...x,logoUrl:""}));}
  async function handleBannerUpload(e) { const f=e.target.files?.[0]; e.target.value=""; const data=await uploadImage("/api/admin/banner",f,8*1024*1024,"banner"); if(data?.banner){const b=data.banner;setForm((x)=>({...x,bannerId:b.id||"",bannerImageUrl:b.imageUrl||"",bannerEnabled:true}));setMessages((m)=>({...m,banner:"Banner uploaded."}));} }
  async function removeBanner(){const {ok}=await apiFetch("/api/admin/banner",{method:"DELETE"});if(ok)setForm((x)=>({...x,bannerId:"",bannerImageUrl:"",bannerEnabled:false}));}
  async function handleFleetUpload(e){const f=e.target.files?.[0];e.target.value="";const categoryName=fleetCategories.find((c)=>c.id===fleetCategoryId)?.name || "Other";const data=await uploadImage("/api/admin/settings/fleet-gallery",f,8*1024*1024,"fleet",{altText:`${categoryName} fleet photo`,categoryId:fleetCategoryId||null});if(data?.item)setForm((x)=>({...x,fleetGallery:[...x.fleetGallery,data.item]}));}
  async function removeFleet(id){const {ok}=await apiFetch(`/api/admin/settings/fleet-gallery/${id}`,{method:"DELETE"});if(ok)setForm((x)=>({...x,fleetGallery:x.fleetGallery.filter((p)=>p.id!==id)}));}
  async function handleSave(e){e.preventDefault();setSaving(true);setSaveError(null);const {ok,data}=await apiFetch("/api/admin/settings",{method:"PATCH",body:JSON.stringify(toPayload(form))});setSaving(false);if(ok&&data?.success){setForm(toForm(data.settings));setSaved(true);}else setSaveError(data?.error||"Failed to save settings.");}
  if(loading)return <AdminLayout title={meta.title}><p className="admin-loading">Loading settings…</p></AdminLayout>;
  const common={form,set};
  return <AdminLayout title={meta.title} lead={meta.lead}>{error&&<p className="admin-error">{error}</p>}{active==="fleetGallery" ? <SettingsCardContent title="Fleet gallery photos" description="Organize gallery photos by fleet category. Bus, van and other vehicle photos can be managed separately by the admin team."><div className="admin-form-field" style={{maxWidth:"360px"}}><label className="otp-label-text" htmlFor="fleet-category">Fleet category</label><select id="fleet-category" className="admin-select" value={fleetCategoryId} onChange={(e)=>setFleetCategoryId(e.target.value)}><option value="">Other / General</option>{fleetCategories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><UploadCard label="Add fleet photo" help="Choose a category before uploading so customers can browse bus, van and other fleet photos separately." aspect="4:3 or 16:9 works best" inputId="fleet-upload" message={messages.fleet} uploading={uploading.fleet} onUpload={handleFleetUpload} url="" onRemove={()=>{}}/><div className="admin-fleet-grid">{form.fleetGallery.map((photo)=><div className="admin-fleet-item" key={photo.id}><img src={photo.imageUrl} alt={photo.altText||"Fleet"}/><div className="admin-fleet-item-meta"><span>{photo.categoryName || "Other"}</span><button type="button" className="btn btn-outline btn-sm" onClick={()=>removeFleet(photo.id)}>Remove</button></div></div>)}</div></SettingsCardContent> : <SettingsCard saveError={saveError} saved={saved} saving={saving} onSubmit={handleSave}>{active==="business"&&<BusinessSection {...common} logoMessage={messages.logo} logoUploading={uploading.logo} handleLogoUpload={handleLogoUpload} removeLogo={removeLogo}/>} {active==="invoice"&&<InvoiceSection form={form} set={set} url={form.signatureUrl} message={messages.signature} uploading={uploading.signature} onUpload={handleSignatureUpload} onRemove={removeSignature}/>} {active==="banner"&&<BannerSection {...common} url={form.bannerImageUrl} message={messages.banner} uploading={uploading.banner} onUpload={handleBannerUpload} onRemove={removeBanner}/>} </SettingsCard>}</AdminLayout>;
}
