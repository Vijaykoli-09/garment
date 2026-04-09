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
  artNo: string;
  artName: string;
  artSerialNumber: string;
}

interface ArtListItem {
  serialNumber: string;
  artNo: string;
  artName: string;
  saleRate?: string;
}

// ── Category / Sub-category master list ──────────────────────────────────────
const CATEGORY_MAP: Record<string, string[]> = {
  MEN:   ["T-Shirt","Pouch Gents","Gents Sweet Shirt","Gents Pajama","Track Suit","Night Suit","Boys Suit"],
  WOMEN: ["Ladies Pouch","Girly Pouch","Girlyish Tees","Ladies Sweet","Ladies Pajama","Girl Suit","Night Suit","Track Suit"],
  KIDS:  ["Kit T-Shirt","Kids Pouch","Kids Sweet Shirt","Kid Pajama","Boys Suit","Girl Suit","Track Suit","Night Suit"],
};
const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

function getSubCategoryOptions(selectedCats: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of selectedCats)
    for (const sub of (CATEGORY_MAP[cat] ?? []))
      if (!seen.has(sub)) { seen.add(sub); result.push(sub); }
  return result;
}

const EMPTY: Omit<Product, "id" | "active"> = {
  name: "", description: "", categories: [], subCategory: "",
  images: [], sizes: [], boxQuantity: 12,
  artNo: "", artName: "", artSerialNumber: "",
  pricing: { wholeSeller: 0, semiWholeSeller: 0, retailer: 0 },
  minBox:  { wholeSeller: 10, semiWholeSeller: 8, retailer: 5 },
};

const TIERS = [
  { key: "wholeSeller",     label: "Whole Seller",  color: "#6366f1", bg: "#eef2ff", minDefault: 10 },
  { key: "semiWholeSeller", label: "Semi Wholesale", color: "#0ea5e9", bg: "#f0f9ff", minDefault: 8  },
  { key: "retailer",        label: "Retailer",       color: "#10b981", bg: "#f0fdf4", minDefault: 5  },
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

  // ── Art Modal ──────────────────────────────────────────────────────────
  const [artOptions, setArtOptions]     = useState<ArtListItem[]>([]);
  const [showArtModal, setShowArtModal] = useState(false);
  const [artSearch, setArtSearch]       = useState("");

  useEffect(() => {
    api.get<ArtListItem[]>("/arts/dropdown")
      .then(r => setArtOptions(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try { const r = await api.get("/admin/products"); setProducts(r.data); }
    catch { setPageError("Failed to load products."); }
    finally { setLoading(false); }
  };

  // ── Art selection helpers ─────────────────────────────────────────────────
  const selectArt = (art: ArtListItem) => {
    setFormData(f => ({ 
      ...f, 
      artNo: art.artNo, 
      artName: art.artName, 
      artSerialNumber: art.serialNumber 
    }));
    setShowArtModal(false);
    setArtSearch("");
  };

  const clearArt = () => {
    setFormData(f => ({ ...f, artNo: "", artName: "", artSerialNumber: "" }));
  };

  const filteredArts = artOptions.filter(a => {
    const q = artSearch.toLowerCase().trim();
    return a.artNo.toLowerCase().includes(q) || a.artName.toLowerCase().includes(q);
  });

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadLog([]);
    const urls: string[] = [];

    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      try {
const r = await api.post("/admin/images/upload", fd, {
  headers: { "Content-Type": "multipart/form-data" }
});        urls.push(r.data.url);
        setUploadLog(prev => [...prev, `✓ ${f.name}`]);
      } catch {
        setUploadLog(prev => [...prev, `✗ ${f.name} failed`]);
      }
    }

    setFormData(d => ({ ...d, images: [...d.images, ...urls] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImg = (idx: number) => setFormData(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  const toggleCat = (c: string) => {
    setFormData(f => {
      const has = f.categories.includes(c);
      const next = has ? f.categories.filter(x => x !== c) : [...f.categories, c];
      const subs = getSubCategoryOptions(next);
      const validSub = subs.includes(f.subCategory) ? f.subCategory : "";
      return { ...f, categories: next, subCategory: validSub };
    });
  };

  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (!s || formData.sizes.includes(s)) return;
    setFormData(f => ({ ...f, sizes: [...f.sizes, s] }));
    setNewSize("");
  };
  const removeSize = (s: string) => setFormData(f => ({ ...f, sizes: f.sizes.filter(x => x !== s) }));

  const artIsSelected = !!formData.artNo;
  const subOpts = getSubCategoryOptions(formData.categories);

  const openNew = () => {
    setFormData(EMPTY);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setFormData(p);
    setEditingId(p.id);
    setFormError("");
    setActiveImg({});
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");

    if (!formData.artNo) return setFormError("Art No is required.");
    if (!formData.name.trim()) return setFormError("Product Name is required.");
    if (!formData.categories.length) return setFormError("Select at least one category.");
    if (!formData.subCategory) return setFormError("Sub-category is required.");

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || "",
        categories: formData.categories,
        subCategory: formData.subCategory,
        boxQuantity: formData.boxQuantity,
        sizes: formData.sizes,
        images: formData.images,
        artSerialNumber: formData.artSerialNumber,
        artNo: formData.artNo,
        artName: formData.artName,
        pricing: formData.pricing,
        minBox: formData.minBox,
      };

      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }

      await loadProducts();
      setShowModal(false);
      setFormData(EMPTY);
      setEditingId(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Save failed";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      await loadProducts();
    } catch {
      alert("Delete failed");
    }
  };

  return (
    <Dashboard>
      <div style={s.page}>

        {/* ══ Page Header ══ */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>🏭 Product Management</h1>
            <p style={s.pageSub}>Manage product catalog with art linkage</p>
          </div>
          <button style={s.primaryBtn} onClick={openNew}>+ Add Product</button>
        </div>

        {pageError && <div style={s.errBanner}>{pageError}</div>}

        {loading ? (
          <div style={s.empty}><div style={s.spinner} className="spin" /></div>
        ) : !products.length ? (
          <div style={s.empty}>
            <div style={{ fontSize:56 }}>📦</div>
            <div style={{ fontSize:15, margin:"10px 0", fontWeight:600 }}>No products yet</div>
            <p style={{ margin:0, fontSize:13 }}>Add your first product above</p>
          </div>
        ) : (
          <div style={s.grid}>
            {products.map(p => {
              const mainImage = (p.images && p.images.length > 0) ? p.images[activeImg[p.id] || 0] : "";
              return (
                <div key={p.id} style={s.card}>
                  {mainImage ? (
                    <img src={mainImage} style={s.mainImg} alt={p.name} />
                  ) : (
                    <div style={s.imgPh}>📦</div>
                  )}
                  {p.images && p.images.length > 1 && (
                    <div style={s.thumbRow}>
                      {p.images.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          style={{ 
                            ...s.thumb, 
                            border: (activeImg[p.id] || 0) === i ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            cursor: "pointer"
                          }}
                          onClick={() => setActiveImg(prev => ({ ...prev, [p.id]: i }))}
                          alt=""
                        />
                      ))}
                    </div>
                  )}

                  {/* Art No Badge */}
                  {p.artNo && (
                    <div style={{ ...s.badgeRow, marginTop: 8 }}>
                      <span style={s.artNoBadge}>🎨 {p.artNo}</span>
                    </div>
                  )}

                  {/* Art Name */}
                  {p.artName && (
                    <p style={s.cardArtName}>{p.artName}</p>
                  )}

                  {/* Category Badges */}
                  <div style={s.badgeRow}>
                    {p.categories.map(c => (
                      <span key={c} style={{ ...s.catBadge, ...catBadgeColor(c) }}>
                        {catEmoji(c)} {c}
                      </span>
                    ))}
                    <span style={s.subCatBadge}>{p.subCategory}</span>
                  </div>

                  <h3 style={s.cardName}>{p.name}</h3>
                  {p.description && <p style={s.cardDesc}>{p.description}</p>}

                  <p style={s.cardMeta}>
                    <strong>Box Qty:</strong> {p.boxQuantity} pcs
                    {p.sizes && p.sizes.length > 0 && (
                      <> · <strong>Sizes:</strong> {p.sizes.join(", ")}</>
                    )}
                  </p>

                  {/* Pricing Table */}
                  <div style={s.tierTable}>
                    <div style={s.tierHead}>
                      <div></div>
                      <div style={{ textAlign:"center" }}>Price/Box</div>
                      <div style={{ textAlign:"center" }}>Min Boxes</div>
                    </div>
                    {TIERS.map(tier => (
                      <div key={tier.key} style={{ ...s.tierRow, background: tier.bg }}>
                        <div style={{ ...s.tierLabel, color: tier.color }}>{tier.label}</div>
                        <div style={{ ...s.tierPrice, textAlign:"center" }}>₹{p.pricing[tier.key] || 0}</div>
                        <div style={{ ...s.tierMin, textAlign:"center" }}>{p.minBox[tier.key] || tier.minDefault}</div>
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
        )}

        {/* ══════════════════════════════════════════════════════════════
            PRODUCT FORM MODAL
        ══════════════════════════════════════════════════════════════ */}
        {showModal && (
          <div style={s.overlay} onClick={() => !uploading && setShowModal(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div style={s.mHead}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={s.mTitle}>{editingId ? "Edit Product" : "Add Product"}</span>
                  {artIsSelected && (
                    <span style={s.mArtPill}>🎨 {formData.artNo}</span>
                  )}
                </div>
                <button style={s.closeBtn} onClick={() => !uploading && setShowModal(false)}>✕</button>
              </div>

              {formError && <div style={{ ...s.errBanner, marginBottom:14 }}>{formError}</div>}

              {/* ────────────────────────────────────────────
                  STEP 1 — ART NO (with modal button)
              ──────────────────────────────────────────── */}
              <div style={{
                ...s.stepBox,
                borderColor: artIsSelected ? "#86efac" : "#93c5fd",
                background:  artIsSelected ? "#f0fdf4" : "#eff6ff",
              }}>
                <div style={s.stepHeader}>
                  <span style={{ ...s.stepBadge, background: artIsSelected ? "#16a34a" : "#2563eb" }}>1</span>
                  <span style={{ ...s.stepTitle, color: artIsSelected ? "#166534" : "#1e40af" }}>
                    Select Art No <span style={{ color:"#ef4444" }}>*</span>
                  </span>
                  {artIsSelected && <span style={s.stepDone}>✓ Art Linked</span>}
                </div>

                {/* Select Art Button */}
                <button 
                  onClick={() => setShowArtModal(true)}
                  style={{
                    ...s.selectArtBtn,
                    borderColor: artIsSelected ? "#86efac" : "#93c5fd",
                    background: artIsSelected ? "#f0fdf4" : "#fff",
                  }}
                >
                  {artIsSelected ? (
                    <>
                      <span style={{ fontSize: 16 }}>🎨</span>
                      <span style={{ fontWeight: 700, color: "#2563eb" }}>{formData.artNo}</span>
                      <span style={{ color: "#64748b" }}>—</span>
                      <span style={{ color: "#374151" }}>{formData.artName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearArt();
                        }}
                        style={s.clearArtBtn}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 16 }}>🎨</span>
                      <span style={{ color: "#64748b" }}>Click to select art...</span>
                    </>
                  )}
                </button>

                {/* Auto-filled info card */}
                {artIsSelected && (
                  <div style={s.artInfoCard}>
                    <div style={s.artInfoGrid}>
                      <div style={s.artInfoField}>
                        <span style={s.artInfoLabel}>Art No</span>
                        <span style={{ ...s.artInfoValue, color:"#2563eb" }}>{formData.artNo}</span>
                      </div>
                      <div style={s.artInfoField}>
                        <span style={s.artInfoLabel}>Art Name</span>
                        <span style={s.artInfoValue}>{formData.artName || "—"}</span>
                      </div>
                      <div style={s.artInfoField}>
                        <span style={s.artInfoLabel}>Serial Number</span>
                        <span style={{ ...s.artInfoValue, fontFamily:"monospace", fontSize:11, color:"#475569" }}>
                          {formData.artSerialNumber || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {!artIsSelected && (
                  <p style={{ fontSize:11, color:"#3b82f6", margin:"10px 0 0", lineHeight:1.5 }}>
                    ⓘ Select an Art No first — it links this product to your Art record for tracking &amp; costing.
                    The rest of the form will unlock after selection.
                  </p>
                )}
              </div>

              {/* ────────────────────────────────────────────
                  STEPS 2–6 — locked until art is chosen
              ──────────────────────────────────────────── */}
              <div style={{ opacity: artIsSelected ? 1 : 0.35, pointerEvents: artIsSelected ? "auto" : "none", transition:"opacity 0.2s" }}>

                {/* ── STEP 2 · Product Details ── */}
                <div style={s.stepBox2}>
                  <div style={s.stepHeader}>
                    <span style={{ ...s.stepBadge, background:"#6366f1" }}>2</span>
                    <span style={{ ...s.stepTitle, color:"#4338ca" }}>Product Details</span>
                  </div>

                  <label style={s.label}>Product Name *</label>
                  <input style={s.input} value={formData.name} placeholder="e.g. White Premium T-Shirt"
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />

                  <label style={s.label}>Description</label>
                  <textarea style={{ ...s.input, height:64, resize:"vertical" }}
                    value={formData.description} placeholder="Describe the product..."
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* ── STEP 3 · Category ── */}
                <div style={s.stepBox2}>
                  <div style={s.stepHeader}>
                    <span style={{ ...s.stepBadge, background:"#0ea5e9" }}>3</span>
                    <span style={{ ...s.stepTitle, color:"#0369a1" }}>Category & Sub-Category *</span>
                  </div>

                  <label style={s.subLabel}>Select Category/Categories</label>
                  <div style={s.catRow}>
                    {ALL_CATEGORIES.map(c => (
                      <button
                        key={c}
                        style={formData.categories.includes(c) ? { ...s.catBtn, ...catBtnActive(c) } : s.catBtn}
                        onClick={() => toggleCat(c)}
                        type="button"
                      >
                        {catEmoji(c)} {c}
                      </button>
                    ))}
                  </div>

                  {formData.categories.length > 0 && (
                    <>
                      <label style={{ ...s.label, marginTop: 14 }}>Sub-Category *</label>
                      <select
                        style={s.select}
                        value={formData.subCategory}
                        onChange={e => setFormData(f => ({ ...f, subCategory: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        {subOpts.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </>
                  )}
                </div>

                {/* ── STEP 4 · Sizes ── */}
                <div style={s.stepBox2}>
                  <div style={s.stepHeader}>
                    <span style={{ ...s.stepBadge, background:"#f59e0b" }}>4</span>
                    <span style={{ ...s.stepTitle, color:"#92400e" }}>Sizes</span>
                  </div>
                  <p style={s.sectionHint}>Box Quantity: {formData.boxQuantity} pcs per box</p>
                  <label style={s.label}>Box Quantity</label>
                  <input type="number" min="1" style={s.input} value={formData.boxQuantity}
                    onChange={e => setFormData(f => ({ ...f, boxQuantity: parseInt(e.target.value) || 12 }))} />

                  <label style={{ ...s.label, marginTop: 12 }}>Add Sizes</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      style={{ ...s.input, marginTop:0 }}
                      placeholder="e.g. M, L, XL"
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addSize()}
                    />
                    <button style={s.addBtn} onClick={addSize} type="button">Add</button>
                  </div>
                  {formData.sizes.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                      {formData.sizes.map(sz => (
                        <span key={sz} style={s.sizeChip}>
                          {sz}
                          <button
                            onClick={() => removeSize(sz)}
                            style={{ marginLeft:6, background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#4f46e5" }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── STEP 5 · Pricing ── */}
                <div style={s.stepBox2}>
                  <div style={s.stepHeader}>
                    <span style={{ ...s.stepBadge, background:"#10b981" }}>5</span>
                    <span style={{ ...s.stepTitle, color:"#065f46" }}>Pricing & Min Order</span>
                  </div>
                  <p style={s.sectionHint}>Price per BOX (not per piece)</p>

                  <div style={s.tierGrid}>
                    {TIERS.map(tier => (
                      <div key={tier.key} style={{ ...s.tierCard, borderColor: tier.color }}>
                        <div style={{ fontSize:10, fontWeight:700, color:tier.color, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                          {tier.label}
                        </div>

                        <label style={{ fontSize:10, fontWeight:700, color:"#475569", marginTop:4 }}>Price per Box</label>
                        <div style={s.rupeeRow}>
                          <span style={s.rupee}>₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={s.numInput}
                            value={formData.pricing[tier.key]}
                            onChange={e => setFormData(f => ({
                              ...f,
                              pricing: { ...f.pricing, [tier.key]: parseFloat(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                        <span style={s.perHint}>{formData.boxQuantity} pcs/box</span>

                        <label style={{ fontSize:10, fontWeight:700, color:"#475569", marginTop:6 }}>Min Boxes</label>
                        <input
                          type="number"
                          min="1"
                          style={{ ...s.input, marginTop:3 }}
                          value={formData.minBox[tier.key]}
                          onChange={e => setFormData(f => ({
                            ...f,
                            minBox: { ...f.minBox, [tier.key]: parseInt(e.target.value) || tier.minDefault }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── STEP 6 · Images ── */}
                <div style={s.stepBox2}>
                  <div style={s.stepHeader}>
                    <span style={{ ...s.stepBadge, background:"#ec4899" }}>6</span>
                    <span style={{ ...s.stepTitle, color:"#831843" }}>Product Images</span>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display:"none" }}
                    onChange={handleFiles}
                  />
                  <div style={s.uploadZone}>
                    {uploading ? (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ ...s.spinner, margin:"0 auto 6px" }} className="spin" />
                        <div style={{ fontSize:12, color:"#64748b" }}>Uploading...</div>
                      </div>
                    ) : (
                      <button
                        style={{ ...s.primaryBtn, background:"#ec4899" }}
                        onClick={() => fileRef.current?.click()}
                        type="button"
                      >
                        📷 Upload Images
                      </button>
                    )}
                  </div>

                  {uploadLog.length > 0 && (
                    <div style={s.logBox}>
                      {uploadLog.map((line, i) => (
                        <div key={i} style={{ fontSize:11, color:"#475569" }}>{line}</div>
                      ))}
                    </div>
                  )}

                  {formData.images.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
                      {formData.images.map((url, i) => (
                        <div key={i} style={{ position:"relative", width:70, height:70 }}>
                          <img src={url} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} alt="" />
                          <button style={s.removeBtn} onClick={() => removeImg(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div style={s.mFoot}>
                <button style={s.cancelBtn} onClick={() => !uploading && setShowModal(false)}>Cancel</button>
                <button
                  style={{
                    ...s.primaryBtn,
                    ...(saving || !artIsSelected ? { opacity: 0.5, cursor: "not-allowed" } : {})
                  }}
                  onClick={handleSave}
                  disabled={saving || !artIsSelected}
                  title={!artIsSelected ? "Select an Art No first" : undefined}
                >
                  {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ART SELECTION MODAL
        ══════════════════════════════════════════════════════════════ */}
        {showArtModal && (
          <div style={s.overlay} onClick={() => setShowArtModal(false)}>
            <div style={s.artModal} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={s.mHead}>
                <span style={s.mTitle}>🎨 Select Art</span>
                <button style={s.closeBtn} onClick={() => setShowArtModal(false)}>✕</button>
              </div>

              {/* Search */}
              <input
                style={{ ...s.input, marginBottom: 12 }}
                placeholder="Search by Art No or Art Name..."
                value={artSearch}
                onChange={e => setArtSearch(e.target.value)}
                autoFocus
              />

              {/* Art List Table */}
              <div style={s.artTableContainer}>
                <table style={s.artTable}>
                  <thead>
                    <tr>
                      <th style={s.artTh}>#</th>
                      <th style={s.artTh}>Art No</th>
                      <th style={s.artTh}>Art Name</th>
                      <th style={s.artTh}>Serial Number</th>
                      <th style={s.artTh}>Sale Rate</th>
                      <th style={s.artTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ ...s.artTd, textAlign: "center", color: "#94a3b8", padding: 24 }}>
                          {artOptions.length === 0 ? "No arts available" : "No matches found"}
                        </td>
                      </tr>
                    ) : (
                      filteredArts.map((art, i) => (
                        <tr 
                          key={art.serialNumber}
                          style={{ 
                            background: formData.artSerialNumber === art.serialNumber ? "#eff6ff" : "#fff"
                          }}
                        >
                          <td style={s.artTd}>{i + 1}</td>
                          <td style={{ ...s.artTd, fontWeight: 700, color: "#2563eb" }}>{art.artNo}</td>
                          <td style={s.artTd}>{art.artName}</td>
                          <td style={{ ...s.artTd, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                            {art.serialNumber}
                          </td>
                          <td style={s.artTd}>{art.saleRate || "—"}</td>
                          <td style={s.artTd}>
                            <button
                              onClick={() => selectArt(art)}
                              style={{
                                padding: "6px 14px",
                                background: "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 12
                              }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                <button style={s.cancelBtn} onClick={() => setShowArtModal(false)}>Close</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Dashboard>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function catEmoji(c: string) { return c === "MEN" ? "👔" : c === "WOMEN" ? "👗" : c === "KIDS" ? "🧒" : "🏷"; }
function catBadgeColor(c: string): React.CSSProperties {
  return c === "MEN"   ? { background:"#dbeafe", color:"#1d4ed8" }
       : c === "WOMEN" ? { background:"#fce7f3", color:"#be185d" }
       : c === "KIDS"  ? { background:"#d1fae5", color:"#065f46" }
       : {};
}
function catBtnActive(c: string): React.CSSProperties {
  return c === "MEN"   ? { background:"#1d4ed8", color:"#fff", borderColor:"#1d4ed8" }
       : c === "WOMEN" ? { background:"#be185d", color:"#fff", borderColor:"#be185d" }
       : c === "KIDS"  ? { background:"#065f46", color:"#fff", borderColor:"#065f46" }
       : { background:"#2563eb", color:"#fff" };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:          { padding:24, minHeight:"100vh", background:"#f8fafc" },
  pageHeader:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  pageTitle:     { margin:0, fontSize:22, fontWeight:700, color:"#0f172a" },
  pageSub:       { margin:"4px 0 0", fontSize:13, color:"#64748b" },
  errBanner:     { background:"#fee2e2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:13 },
  empty:         { display:"flex", flexDirection:"column", alignItems:"center", padding:60, color:"#94a3b8" },
  spinner:       { width:28, height:28, border:"3px solid #e2e8f0", borderTopColor:"#2563eb", borderRadius:"50%", flexShrink:0 },
  grid:          { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:20 },
  card:          { background:"#fff", borderRadius:14, padding:16, border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.07)" },
  mainImg:       { width:"100%", height:200, objectFit:"cover", borderRadius:10, marginBottom:8 },
  imgPh:         { width:"100%", height:200, background:"#f1f5f9", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, marginBottom:8 },
  thumbRow:      { display:"flex", gap:6, flexWrap:"wrap", marginTop:6 },
  thumb:         { width:48, height:48, objectFit:"cover", borderRadius:6 },
  badgeRow:      { display:"flex", gap:6, flexWrap:"wrap", margin:"6px 0 2px" },
  catBadge:      { fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  subCatBadge:   { fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#f1f5f9", color:"#475569" },
  artNoBadge:    { fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#fef3c7", color:"#92400e" },
  cardName:      { margin:"8px 0 2px", fontSize:15, fontWeight:700, color:"#0f172a" },
  cardArtName:   { margin:"0 0 4px", fontSize:11, color:"#2563eb", fontWeight:600 },
  cardDesc:      { margin:"0 0 6px", fontSize:12, color:"#64748b" },
  cardMeta:      { margin:"2px 0 8px", fontSize:12, color:"#374151" },
  cardActions:   { display:"flex", gap:8, marginTop:12 },
  tierTable:     { borderRadius:8, overflow:"hidden", border:"1px solid #e2e8f0", fontSize:12 },
  tierHead:      { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", background:"#f8fafc", padding:"7px 10px", fontWeight:700, color:"#475569", borderBottom:"1px solid #e2e8f0" },
  tierRow:       { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", padding:"8px 10px", borderBottom:"1px solid #f1f5f9" },
  tierLabel:     { fontWeight:700 },
  tierPrice:     { fontWeight:700, color:"#0f172a" },
  tierMin:       { color:"#64748b" },
  overlay:       { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000 },
  modal:         { background:"#fff", padding:24, borderRadius:16, width:560, maxHeight:"93vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" },
  artModal:      { background:"#fff", padding:24, borderRadius:16, width:900, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" },
  mHead:         { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #f1f5f9" },
  mTitle:        { fontSize:16, fontWeight:700, color:"#0f172a" },
  mArtPill:      { fontSize:11, fontWeight:700, background:"#fef3c7", color:"#92400e", padding:"2px 9px", borderRadius:20 },
  mFoot:         { display:"flex", gap:8, justifyContent:"flex-end", marginTop:20, paddingTop:14, borderTop:"1px solid #f1f5f9" },
  closeBtn:      { background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8", padding:4 },
  stepBox:       { border:"2px solid", borderRadius:12, padding:"14px 16px" },
  stepBox2:      { border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px", marginTop:14, background:"#fafafa" },
  stepHeader:    { display:"flex", alignItems:"center", gap:8, marginBottom:4 },
  stepBadge:     { width:22, height:22, borderRadius:"50%", color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  stepTitle:     { fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" },
  stepDone:      { marginLeft:"auto", fontSize:11, fontWeight:700, color:"#16a34a", background:"#dcfce7", padding:"2px 9px", borderRadius:20 },
  label:         { display:"block", fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginTop:12, marginBottom:4 },
  subLabel:      { display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:8 },
  input:         { width:"100%", padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, marginTop:4, fontSize:13, color:"#0f172a", boxSizing:"border-box", outline:"none" },
  select:        { width:"100%", padding:"9px 10px", border:"1px solid #e2e8f0", borderRadius:8, marginTop:4, fontSize:13, color:"#0f172a", boxSizing:"border-box", outline:"none", background:"#fff", cursor:"pointer" },
  hint:          { fontSize:11, color:"#94a3b8", margin:"3px 0 0" },
  sectionHint:   { fontSize:11, color:"#64748b", margin:"4px 0 10px" },
  tierGrid:      { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },
  tierCard:      { background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 10px", display:"flex", flexDirection:"column", gap:6 },
  rupeeRow:      { display:"flex", alignItems:"center", border:"1px solid #e2e8f0", borderRadius:6, overflow:"hidden" },
  rupee:         { padding:"7px 8px", background:"#f1f5f9", fontWeight:700, fontSize:13, color:"#475569", borderRight:"1px solid #e2e8f0" },
  numInput:      { flex:1, padding:"7px 8px", border:"none", outline:"none", fontSize:14, fontWeight:700, color:"#0f172a" },
  perHint:       { fontSize:10, color:"#94a3b8" },
  uploadZone:    { border:"2px dashed #cbd5e1", borderRadius:10, padding:"18px 12px", background:"#f8fafc", display:"flex", justifyContent:"center", alignItems:"center", minHeight:78 },
  logBox:        { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", marginTop:8 },
  removeBtn:     { position:"absolute", top:-6, right:-6, width:18, height:18, background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" },
  sizeChip:      { padding:"3px 10px", background:"#e0e7ff", color:"#4f46e5", borderRadius:20, fontSize:12, fontWeight:600, display:"flex", alignItems:"center" },
  primaryBtn:    { padding:"9px 18px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  cancelBtn:     { padding:"9px 16px", background:"#fff", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 },
  editBtn:       { flex:1, padding:"7px", background:"#10b981", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  deleteBtn:     { flex:1, padding:"7px", background:"#ef4444", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  addBtn:        { padding:"9px 14px", background:"#e0e7ff", color:"#4f46e5", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap" },
  catRow:        { display:"flex", gap:8, marginTop:4 },
  catBtn:        { flex:1, padding:"9px 6px", border:"1px solid #e2e8f0", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, background:"#f8fafc", color:"#475569" },
  // ✅ NEW: Art selection button
  selectArtBtn:  { width:"100%", marginTop:10, padding:"12px 14px", border:"2px solid", borderRadius:10, cursor:"pointer", background:"#fff", display:"flex", alignItems:"center", gap:10, fontSize:13 },
  clearArtBtn:   { marginLeft:"auto", background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", width:20, height:20, cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" },
  // Art info card (auto-filled)
  artInfoCard:   { marginTop:12, background:"#fff", border:"1px solid #bbf7d0", borderRadius:10, padding:"12px 14px" },
  artInfoGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 },
  artInfoField:  { display:"flex", flexDirection:"column", gap:3 },
  artInfoLabel:  { fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.4px" },
  artInfoValue:  { fontSize:13, fontWeight:700, color:"#0f172a" },
  // ✅ NEW: Art modal table styles
  artTableContainer: { maxHeight: "60vh", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 },
  artTable:      { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  artTh:         { background: "#f8fafc", padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", position: "sticky", top: 0 },
  artTd:         { padding: "10px 12px", borderBottom: "1px solid #f1f5f9" },
};