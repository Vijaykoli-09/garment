import React, { useEffect, useRef, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

interface Pricing { wholeSeller: number; semiWholeSeller: number; retailer: number; }
interface MinBox  { wholeSeller: number; semiWholeSeller: number; retailer: number; }
interface Product {
  id: number; name: string; description: string;
  categories: string[]; subCategory: string;
  images: string[]; sizes: string[]; boxQuantity: number;
  pricing: Pricing; minBox: MinBox; active: boolean;
}

// ── Category / Sub-category master list ──────────────────────────────────────
// To add/remove a category or sub-category, edit only this map.
const CATEGORY_MAP: Record<string, string[]> = {
  MEN: [
    "T-Shirt",
    "Pouch Gents",
    "Gents Sweet Shirt",
    "Gents Pajama",
    "Track Suit",
    "Night Suit",
    "Boys Suit",
  ],
  WOMEN: [
    "Ladies Pouch",
    "Girly Pouch",
    "Girlyish Tees",
    "Ladies Sweet",
    "Ladies Pajama",
    "Girl Suit",
    "Night Suit",
    "Track Suit",
  ],
  KIDS: [
    "Kit T-Shirt",
    "Kids Pouch",
    "Kids Sweet Shirt",
    "Kid Pajama",
    "Boys Suit",
    "Girl Suit",
    "Track Suit",
    "Night Suit",
  ],
};

const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

// Returns the union of sub-categories for the selected categories (deduped, order preserved)
function getSubCategoryOptions(selectedCats: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of selectedCats) {
    for (const sub of (CATEGORY_MAP[cat] ?? [])) {
      if (!seen.has(sub)) { seen.add(sub); result.push(sub); }
    }
  }
  return result;
}

const EMPTY: Omit<Product, "id" | "active"> = {
  name: "", description: "", categories: [], subCategory: "",
  images: [], sizes: [], boxQuantity: 12,
  pricing: { wholeSeller: 0, semiWholeSeller: 0, retailer: 0 },
  minBox:  { wholeSeller: 10, semiWholeSeller: 8, retailer: 5 },
};

const TIERS = [
  { key: "wholeSeller",     label: "Whole Seller",   color: "#6366f1", bg: "#eef2ff", minDefault: 10 },
  { key: "semiWholeSeller", label: "Semi Wholesale",  color: "#0ea5e9", bg: "#f0f9ff", minDefault: 8  },
  { key: "retailer",        label: "Retailer",        color: "#10b981", bg: "#f0fdf4", minDefault: 5  },
] as const;

export default function AddProduct() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [formData, setFormData]   = useState<Omit<Product, "id" | "active">>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [newSize, setNewSize]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const [activeImg, setActiveImg] = useState<Record<number, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/admin/products"); setProducts(r.data); }
    catch { setPageError("Failed to load products."); }
    finally { setLoading(false); }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (formData.images.length + files.length > 10) { setFormError("Max 10 images."); return; }
    if (files.some(f => f.size > 10 * 1024 * 1024))  { setFormError("Max 10 MB per image."); return; }
    setUploading(true);
    setUploadLog(files.map(f => `⏳ ${f.name}`));
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      try {
        const r = await api.post("/admin/images/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        urls.push(r.data.url);
        setUploadLog(l => l.map((x, j) => j === i ? `✅ ${files[i].name}` : x));
      } catch {
        setUploadLog(l => l.map((x, j) => j === i ? `❌ ${files[i].name} — failed` : x));
      }
    }
    if (urls.length) setFormData(f => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
    setTimeout(() => setUploadLog([]), 3000);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImg = async (idx: number) => {
    const url = formData.images[idx];
    setFormData(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    try { await api.delete("/admin/images/delete", { data: { url } }); } catch {}
  };

  const openAdd = () => {
    setEditingId(null); setFormData(EMPTY); setFormError(""); setUploadLog([]); setShowModal(true);
  };
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, description: p.description,
      categories: p.categories ?? [], subCategory: p.subCategory ?? "",
      images: p.images, sizes: p.sizes, boxQuantity: p.boxQuantity,
      pricing: { ...p.pricing },
      minBox: p.minBox ? { ...p.minBox } : { wholeSeller: 10, semiWholeSeller: 8, retailer: 5 },
    });
    setFormError(""); setUploadLog([]); setShowModal(true);
  };

  // Toggle a category on/off; if removed, reset subCategory if it's no longer valid
  const toggleCategory = (cat: string) => {
    setFormData(f => {
      const already = f.categories.includes(cat);
      const newCats = already
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat];
      // If the current subCategory is no longer in the new union, clear it
      const newSubs = getSubCategoryOptions(newCats);
      const subStillValid = newSubs.includes(f.subCategory);
      return { ...f, categories: newCats, subCategory: subStillValid ? f.subCategory : "" };
    });
  };

  const validate = () => {
    if (!formData.name.trim())            return "Product name is required.";
    if (formData.categories.length === 0) return "Select at least one category.";
    if (!formData.subCategory)            return "Please select a sub-category.";
    if (formData.boxQuantity < 1)         return "Pieces per box must be at least 1.";
    if (uploading)                        return "Please wait for images to finish uploading.";
    for (const t of TIERS) {
      if ((formData.pricing as any)[t.key] < 0) return `${t.label} price cannot be negative.`;
      if ((formData.minBox as any)[t.key] < 1)  return `${t.label} min boxes must be at least 1.`;
    }
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setSaving(true); setFormError("");
    try {
      if (editingId !== null) {
        const r = await api.put(`/admin/products/${editingId}`, formData);
        setProducts(ps => ps.map(p => p.id === editingId ? r.data : p));
      } else {
        const r = await api.post("/admin/products", formData);
        setProducts(ps => [r.data, ...ps]);
      }
      setShowModal(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "Failed to save product.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"?\n\nThis is permanent and removes all images.`)) return;
    try { await api.delete(`/admin/products/${p.id}`); setProducts(ps => ps.filter(x => x.id !== p.id)); }
    catch { alert("Delete failed."); }
  };

  const setPricing = (key: string, val: number) =>
    setFormData(f => ({ ...f, pricing: { ...f.pricing, [key]: val } }));
  const setMinBox = (key: string, val: number) =>
    setFormData(f => ({ ...f, minBox: { ...f.minBox, [key]: val } }));

  const addSize = () => {
    const sz = newSize.trim().toUpperCase();
    if (!sz || formData.sizes.includes(sz)) return;
    setFormData(f => ({ ...f, sizes: [...f.sizes, sz] })); setNewSize("");
  };
  const removeSize = (sz: string) => setFormData(f => ({ ...f, sizes: f.sizes.filter(x => x !== sz) }));

  const subCategoryOptions = getSubCategoryOptions(formData.categories);

  if (loading) return (
    <Dashboard>
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:300 }}>
        <div style={s.spinner} /><span style={{ color:"#64748b", marginLeft:12 }}>Loading...</span>
      </div>
    </Dashboard>
  );

  return (
    <Dashboard>
      <div style={s.page}>

        {/* Header */}
        <div style={s.pageHeader}>
          <div>
            <h2 style={s.pageTitle}>Products</h2>
            <p style={s.pageSub}>{products.length} product{products.length !== 1 ? "s" : ""}</p>
          </div>
          <button style={s.primaryBtn} onClick={openAdd}>+ Add Product</button>
        </div>

        {pageError && <div style={s.errBanner}>{pageError}</div>}

        {/* Grid */}
        {products.length === 0
          ? <div style={s.empty}><div style={{ fontSize:52 }}>📦</div><p style={{ color:"#94a3b8" }}>No products yet.</p></div>
          : (
            <div style={s.grid}>
              {products.map(p => {
                const ai = activeImg[p.id] ?? 0;
                return (
                  <div key={p.id} style={s.card}>
                    {p.images.length > 0
                      ? <img src={p.images[ai]} style={s.mainImg} alt={p.name} />
                      : <div style={s.imgPh}>👕</div>
                    }
                    {p.images.length > 1 && (
                      <div style={s.thumbRow}>
                        {p.images.map((img, i) => (
                          <img key={i} src={img} alt=""
                            onClick={() => setActiveImg(m => ({ ...m, [p.id]: i }))}
                            style={{ ...s.thumb, outline: i === ai ? "2px solid #2563eb" : "none", cursor:"pointer" }} />
                        ))}
                      </div>
                    )}

                    {/* Category + sub-category badges */}
                    {(p.categories?.length > 0 || p.subCategory) && (
                      <div style={s.badgeRow}>
                        {(p.categories ?? []).map(cat => (
                          <span key={cat} style={{ ...s.catBadge, ...catBadgeColor(cat) }}>{catEmoji(cat)} {cat}</span>
                        ))}
                        {p.subCategory && <span style={s.subCatBadge}>{p.subCategory}</span>}
                      </div>
                    )}

                    <h3 style={s.cardName}>{p.name}</h3>
                    <p  style={s.cardDesc}>{p.description}</p>
                    <p  style={s.cardMeta}><b>Sizes:</b> {p.sizes.join(", ") || "—"} &nbsp;|&nbsp; <b>Pcs/Box:</b> {p.boxQuantity}</p>

                    {/* Tier table */}
                    <div style={s.tierTable}>
                      <div style={s.tierHead}>
                        <span>Customer Type</span><span>Price/Box</span><span>Min Boxes</span>
                      </div>
                      {TIERS.map(t => (
                        <div key={t.key} style={{ ...s.tierRow, background: t.bg }}>
                          <span style={{ ...s.tierLabel, color: t.color }}>{t.label}</span>
                          <span style={s.tierPrice}>₹{(p.pricing as any)[t.key]}</span>
                          <span style={s.tierMin}>{(p.minBox as any)?.[t.key] ?? t.minDefault} boxes</span>
                        </div>
                      ))}
                    </div>

                    <div style={s.cardActions}>
                      <button style={s.editBtn}   onClick={() => openEdit(p)}>✎ Edit</button>
                      <button style={s.deleteBtn} onClick={() => handleDelete(p)}>🗑 Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* ══ MODAL ══ */}
        {showModal && (
          <div style={s.overlay} onClick={() => !uploading && setShowModal(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>

              <div style={s.mHead}>
                <span style={s.mTitle}>{editingId ? "Edit Product" : "Add Product"}</span>
                <button style={s.closeBtn} onClick={() => !uploading && setShowModal(false)}>✕</button>
              </div>

              {formError && <div style={{ ...s.errBanner, marginBottom:14 }}>{formError}</div>}

              {/* Name */}
              <label style={s.label}>Product Name *</label>
              <input style={s.input} value={formData.name} placeholder="e.g. White Premium T-Shirt"
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />

              {/* Description */}
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.input, height:64, resize:"vertical" }}
                value={formData.description} placeholder="Describe the product..."
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />

              {/* ── CATEGORY (multi-select) ── */}
              <label style={s.label}>
                Category * <span style={{ fontWeight:400, color:"#94a3b8", textTransform:"none", marginLeft:4 }}>(select one or more)</span>
              </label>
              <div style={s.catRow}>
                {ALL_CATEGORIES.map(cat => {
                  const selected = formData.categories.includes(cat);
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)}
                      style={{ ...s.catBtn, ...(selected ? catBtnActive(cat) : {}) }}>
                      {catEmoji(cat)} {cat}
                      {selected && <span style={{ marginLeft:5, fontSize:11 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* ── SUB-CATEGORY (single, shown only after a category is picked) ── */}
              {formData.categories.length > 0 && (
                <>
                  <label style={s.label}>Sub-Category *</label>
                  <p style={s.hint}>
                    Showing sub-categories for: <strong>{formData.categories.join(", ")}</strong>
                  </p>
                  <select style={s.select} value={formData.subCategory}
                    onChange={e => setFormData(f => ({ ...f, subCategory: e.target.value }))}>
                    <option value="">— Select sub-category —</option>
                    {subCategoryOptions.map(sc => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </>
              )}

              {/* Pcs per box */}
              <label style={s.label}>Pieces per Box *</label>
              <input type="number" style={s.input} min={1} value={formData.boxQuantity}
                onChange={e => setFormData(f => ({ ...f, boxQuantity: Number(e.target.value) }))} />
              <p style={s.hint}>e.g. 12 means 1 box contains 12 pieces</p>

              {/* Images */}
              <label style={s.label}>
                Images <span style={{ fontWeight:400, color:"#94a3b8", textTransform:"none", marginLeft:6 }}>(max 10 · 10 MB each)</span>
              </label>
              <div style={{ ...s.uploadZone, cursor: uploading ? "not-allowed" : "pointer" }}
                onClick={() => !uploading && fileRef.current?.click()}>
                <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:"none" }} onChange={handleFiles} />
                {uploading
                  ? <div style={{ textAlign:"center" }}><div style={s.spinner} /><p style={{ fontSize:12, color:"#2563eb", marginTop:6 }}>Uploading...</p></div>
                  : <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:26 }}>📁</div>
                      <p style={{ fontSize:12, color:"#64748b", margin:"4px 0 0" }}>Click to select images</p>
                      <p style={{ fontSize:11, color:"#94a3b8", margin:"2px 0 0" }}>{formData.images.length}/10 uploaded</p>
                    </div>
                }
              </div>
              {uploadLog.length > 0 && (
                <div style={s.logBox}>{uploadLog.map((l, i) => <div key={i} style={{ fontSize:12 }}>{l}</div>)}</div>
              )}
              {formData.images.length > 0 && (
                <div style={{ ...s.thumbRow, marginTop:8 }}>
                  {formData.images.map((img, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <img src={img} style={{ ...s.thumb, width:66, height:66 }} alt="" />
                      <button style={s.removeBtn} onClick={() => removeImg(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sizes */}
              <label style={{ ...s.label, marginTop:16 }}>Sizes</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {["S","M","L","XL","XXL","3XL"].map(sz => {
                  const sel = formData.sizes.includes(sz);
                  return (
                    <button key={sz} onClick={() => sel ? removeSize(sz) : setFormData(f => ({ ...f, sizes: [...f.sizes, sz] }))}
                      style={{ padding:"4px 12px", borderRadius:20, cursor:"pointer", fontWeight:600, fontSize:12,
                        background: sel ? "#4f46e5" : "#f1f5f9", color: sel ? "#fff" : "#475569",
                        border: sel ? "1px solid #4f46e5" : "1px solid #e2e8f0" }}>
                      {sz}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...s.input, flex:1, marginTop:0 }} value={newSize}
                  placeholder="Custom size e.g. 38, 40..." onChange={e => setNewSize(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSize()} />
                <button style={s.addBtn} onClick={addSize}>Add</button>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {formData.sizes.map(sz => (
                  <span key={sz} style={s.sizeChip}>
                    {sz}<span style={{ cursor:"pointer", marginLeft:4, fontWeight:800 }} onClick={() => removeSize(sz)}>×</span>
                  </span>
                ))}
              </div>

              {/* ══ PRICING PER BOX ══ */}
              <div style={s.sectionBox}>
                <p style={s.sectionTitle}>💰 Price per Box</p>
                <p style={s.sectionHint}>
                  Set the price for 1 full box ({formData.boxQuantity} pcs).
                  Each customer type sees <strong>only their own price</strong> in the app.
                </p>
                <div style={s.tierGrid}>
                  {TIERS.map(t => (
                    <div key={t.key} style={{ ...s.tierCard, borderTop:`3px solid ${t.color}` }}>
                      <label style={{ ...s.subLabel, color: t.color }}>{t.label}</label>
                      <div style={s.rupeeRow}>
                        <span style={s.rupee}>₹</span>
                        <input type="number" style={s.numInput} min={0} placeholder="0"
                          value={(formData.pricing as any)[t.key]}
                          onChange={e => setPricing(t.key, Number(e.target.value))} />
                      </div>
                      <span style={s.perHint}>
                        per box · ₹{formData.boxQuantity > 0
                          ? ((formData.pricing as any)[t.key] / formData.boxQuantity).toFixed(2)
                          : "0.00"} per pc
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ══ MIN BOX ORDER ══ */}
              <div style={s.sectionBox}>
                <p style={s.sectionTitle}>📦 Minimum Box Order</p>
                <p style={s.sectionHint}>
                  Customer cannot order below this quantity. The − button is disabled at the minimum.
                </p>
                <div style={s.tierGrid}>
                  {TIERS.map(t => (
                    <div key={t.key} style={{ ...s.tierCard, borderTop:`3px solid ${t.color}` }}>
                      <label style={{ ...s.subLabel, color: t.color }}>{t.label}</label>
                      <input type="number" style={{ ...s.numInput, paddingLeft:10, border:"1px solid #e2e8f0", borderRadius:6, height:36 }}
                        min={1} placeholder={String(t.minDefault)}
                        value={(formData.minBox as any)[t.key]}
                        onChange={e => setMinBox(t.key, Number(e.target.value))} />
                      <span style={s.perHint}>
                        min · {(formData.minBox as any)[t.key] * formData.boxQuantity} pcs minimum
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={s.mFoot}>
                <button style={s.cancelBtn} onClick={() => !uploading && setShowModal(false)} disabled={saving || uploading}>Cancel</button>
                <button style={s.primaryBtn} onClick={handleSave} disabled={saving || uploading}>
                  {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Dashboard>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function catEmoji(cat: string) {
  if (cat === "MEN")   return "👔";
  if (cat === "WOMEN") return "👗";
  if (cat === "KIDS")  return "🧒";
  return "🏷";
}

function catBadgeColor(cat: string): React.CSSProperties {
  if (cat === "MEN")   return { background:"#dbeafe", color:"#1d4ed8" };
  if (cat === "WOMEN") return { background:"#fce7f3", color:"#be185d" };
  if (cat === "KIDS")  return { background:"#d1fae5", color:"#065f46" };
  return {};
}

function catBtnActive(cat: string): React.CSSProperties {
  if (cat === "MEN")   return { background:"#1d4ed8", color:"#fff", borderColor:"#1d4ed8" };
  if (cat === "WOMEN") return { background:"#be185d", color:"#fff", borderColor:"#be185d" };
  if (cat === "KIDS")  return { background:"#065f46", color:"#fff", borderColor:"#065f46" };
  return { background:"#2563eb", color:"#fff" };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:        { padding:24, minHeight:"100vh", background:"#f8fafc" },
  pageHeader:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  pageTitle:   { margin:0, fontSize:22, fontWeight:700, color:"#0f172a" },
  pageSub:     { margin:"4px 0 0", fontSize:13, color:"#64748b" },
  errBanner:   { background:"#fee2e2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:13 },
  empty:       { display:"flex", flexDirection:"column", alignItems:"center", padding:60, color:"#94a3b8" },
  spinner:     { width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%" },
  grid:        { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20 },
  card:        { background:"#fff", borderRadius:14, padding:16, border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  mainImg:     { width:"100%", height:200, objectFit:"cover", borderRadius:10, marginBottom:8 },
  imgPh:       { width:"100%", height:200, background:"#f1f5f9", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, marginBottom:8 },
  thumbRow:    { display:"flex", gap:6, flexWrap:"wrap", marginTop:6 },
  thumb:       { width:48, height:48, objectFit:"cover", borderRadius:6 },
  badgeRow:    { display:"flex", gap:6, flexWrap:"wrap", margin:"6px 0 2px" },
  catBadge:    { fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  subCatBadge: { fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#f1f5f9", color:"#475569" },
  cardName:    { margin:"8px 0 4px", fontSize:15, fontWeight:700, color:"#0f172a" },
  cardDesc:    { margin:"0 0 6px", fontSize:12, color:"#64748b" },
  cardMeta:    { margin:"2px 0 8px", fontSize:12, color:"#374151" },
  cardActions: { display:"flex", gap:8, marginTop:12 },
  tierTable:   { borderRadius:8, overflow:"hidden", border:"1px solid #e2e8f0", fontSize:12 },
  tierHead:    { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", background:"#f8fafc", padding:"7px 10px", fontWeight:700, color:"#475569", borderBottom:"1px solid #e2e8f0" },
  tierRow:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"8px 10px", borderBottom:"1px solid #f1f5f9" },
  tierLabel:   { fontWeight:700 },
  tierPrice:   { fontWeight:700, color:"#0f172a" },
  tierMin:     { color:"#64748b" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000 },
  modal:       { background:"#fff", padding:24, borderRadius:16, width:540, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" },
  mHead:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #f1f5f9" },
  mTitle:      { fontSize:16, fontWeight:700, color:"#0f172a" },
  mFoot:       { display:"flex", gap:8, justifyContent:"flex-end", marginTop:20, paddingTop:12, borderTop:"1px solid #f1f5f9" },
  closeBtn:    { background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8", padding:4 },
  label:       { display:"block", fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginTop:14, marginBottom:4 },
  subLabel:    { display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:8 },
  input:       { width:"100%", padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, marginTop:4, fontSize:13, color:"#0f172a", boxSizing:"border-box", outline:"none" },
  select:      { width:"100%", padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, marginTop:4, fontSize:13, color:"#0f172a", boxSizing:"border-box", outline:"none", background:"#fff", cursor:"pointer" },
  hint:        { fontSize:11, color:"#94a3b8", margin:"3px 0 0" },
  sectionBox:  { marginTop:18, border:"1px solid #e2e8f0", borderRadius:12, padding:16, background:"#fafafa" },
  sectionTitle:{ fontSize:14, fontWeight:700, color:"#0f172a", margin:"0 0 4px" },
  sectionHint: { fontSize:11, color:"#64748b", margin:"0 0 14px" },
  tierGrid:    { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },
  tierCard:    { background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 10px", display:"flex", flexDirection:"column", gap:6 },
  rupeeRow:    { display:"flex", alignItems:"center", border:"1px solid #e2e8f0", borderRadius:6, overflow:"hidden" },
  rupee:       { padding:"7px 8px", background:"#f1f5f9", fontWeight:700, fontSize:13, color:"#475569", borderRight:"1px solid #e2e8f0" },
  numInput:    { flex:1, padding:"7px 8px", border:"none", outline:"none", fontSize:14, fontWeight:700, color:"#0f172a" },
  perHint:     { fontSize:10, color:"#94a3b8" },
  uploadZone:  { border:"2px dashed #cbd5e1", borderRadius:10, padding:"18px 12px", marginTop:6, background:"#f8fafc", display:"flex", justifyContent:"center", alignItems:"center", minHeight:78 },
  logBox:      { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", marginTop:8 },
  removeBtn:   { position:"absolute", top:-6, right:-6, width:18, height:18, background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" },
  sizeChip:    { padding:"3px 10px", background:"#e0e7ff", color:"#4f46e5", borderRadius:20, fontSize:12, fontWeight:600, display:"flex", alignItems:"center" },
  primaryBtn:  { padding:"9px 18px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  cancelBtn:   { padding:"9px 16px", background:"#fff", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 },
  editBtn:     { flex:1, padding:"7px", background:"#10b981", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  deleteBtn:   { flex:1, padding:"7px", background:"#ef4444", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  addBtn:      { padding:"9px 14px", background:"#e0e7ff", color:"#4f46e5", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" },
  catRow:      { display:"flex", gap:8, marginTop:4 },
  catBtn:      { flex:1, padding:"9px 6px", border:"1px solid #e2e8f0", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, background:"#f8fafc", color:"#475569" },
};