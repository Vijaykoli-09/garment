import React, { useEffect, useRef, useState } from "react";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

interface Pricing {
  wholeSeller: number;
  semiWholeSeller: number;
  retailer: number;
}

interface Product {
  id: number;
  name: string;
  images: string[];
  description: string;
  sizes: string[];
  boxQuantity: number;
  pricing: Pricing;
}

const emptyForm: Omit<Product, "id"> = {
  name: "",
  images: [],
  description: "",
  sizes: [],
  boxQuantity: 12,
  pricing: { wholeSeller: 0, semiWholeSeller: 0, retailer: 0 },
};

const AddProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [formData, setFormData] = useState<Omit<Product, "id">>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newSize, setNewSize] = useState("");
  const [activeImgMap, setActiveImgMap] = useState<Record<number, number>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState("");

  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/products");
      setProducts(res.data);
    } catch {
      setPageError("Failed to load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // ── Upload images to Cloudinary ─────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    if (files.some(f => !f.type.startsWith("image/"))) {
      setFormError("Only image files are allowed."); return;
    }
    if (files.some(f => f.size > 10 * 1024 * 1024)) {
      setFormError("Each image must be less than 10 MB."); return;
    }
    if (formData.images.length + files.length > 10) {
      setFormError("Maximum 10 images per product."); return;
    }

    setUploadingImages(true);
    setFormError("");
    setUploadProgress(files.map(f => `⏳ Uploading ${f.name}...`));

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const payload = new FormData();
        payload.append("file", file);

        const res = await api.post("/admin/images/upload", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedUrls.push(res.data.url);
        setUploadProgress(prev =>
          prev.map((p, idx) => idx === i ? `✅ ${file.name} uploaded` : p)
        );
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? "Upload failed";
        setUploadProgress(prev =>
          prev.map((p, idx) => idx === i ? `❌ ${file.name}: ${msg}` : p)
        );
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    }

    setUploadingImages(false);
    setTimeout(() => setUploadProgress([]), 3000);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Remove single image (deletes from Cloudinary too) ───────────
  const removeImage = async (index: number) => {
    const url = formData.images[index];
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    try {
      await api.delete("/admin/images/delete", { data: { url } });
    } catch {
      // silent — already removed from form
    }
  };

  // ── Open Add modal ──────────────────────────────────────────────
  const handleAddNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError("");
    setUploadProgress([]);
    setShowPreview(false);
    setShowModal(true);
  };

  // ── Open Edit modal ─────────────────────────────────────────────
  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      sizes: product.sizes,
      boxQuantity: product.boxQuantity,
      images: product.images,
      pricing: product.pricing,
    });
    setFormError("");
    setUploadProgress([]);
    setShowPreview(false);
    setShowModal(true);
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) { setFormError("Product name is required."); return; }
    if (formData.boxQuantity <= 0) { setFormError("Box quantity must be greater than 0."); return; }
    if (uploadingImages) { setFormError("Please wait for images to finish uploading."); return; }

    setSaving(true);
    setFormError("");

    try {
      if (editingId !== null) {
        const res = await api.put(`/admin/products/${editingId}`, {
          name: formData.name,
          description: formData.description,
          boxQuantity: formData.boxQuantity,
          sizes: formData.sizes,
          images: formData.images,
          pricing: formData.pricing,
        });
        setProducts(prev => prev.map(p => p.id === editingId ? res.data : p));
      } else {
        const res = await api.post("/admin/products", {
          name: formData.name,
          description: formData.description,
          boxQuantity: formData.boxQuantity,
          sizes: formData.sizes,
          images: formData.images,
          pricing: formData.pricing,
        });
        setProducts(prev => [res.data, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product (hard delete — removes from DB + Cloudinary) ──
  const handleDelete = async (product: Product) => {
    if (!window.confirm(
      `Delete "${product.name}"?\n\nThis will permanently delete the product and all its images from Cloudinary. This cannot be undone.`
    )) return;

    try {
      await api.delete(`/admin/products/${product.id}`);
      // Remove from local state immediately
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch {
      alert("Failed to delete product. Please try again.");
    }
  };

  // ── Sizes ───────────────────────────────────────────────────────
  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (!s || formData.sizes.includes(s)) return;
    setFormData({ ...formData, sizes: [...formData.sizes, s] });
    setNewSize("");
  };
  const removeSize = (size: string) =>
    setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== size) });

  const setActiveImg = (productId: number, index: number) =>
    setActiveImgMap(prev => ({ ...prev, [productId]: index }));

  if (loading) {
    return (
      <Dashboard>
        <div style={loadingWrap}>
          <div style={spinnerStyle} />
          <p style={{ color: "#64748b", marginTop: 12 }}>Loading products...</p>
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <div style={page}>

        {/* ── Header ── */}
        <div style={pageHeader}>
          <div>
            <h2 style={pageTitle}>Products</h2>
            <p style={pageSubtitle}>{products.length} product{products.length !== 1 ? "s" : ""}</p>
          </div>
          <button style={primaryBtn} onClick={handleAddNew}>+ Add Product</button>
        </div>

        {pageError && <div style={errorBanner}>{pageError}</div>}

        {/* ── Products Grid ── */}
        {products.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48 }}>📦</div>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>No products yet. Add your first product!</p>
          </div>
        ) : (
          <div style={grid}>
            {products.map(product => {
              const activeIndex = activeImgMap[product.id] ?? 0;
              return (
                <div key={product.id} style={card}>

                  {/* Main image */}
                  {product.images.length > 0 ? (
                    <img
                      src={product.images[activeIndex]}
                      style={mainImage}
                      alt={product.name}
                    />
                  ) : (
                    <div style={imagePlaceholder}>👕</div>
                  )}

                  {/* Thumbnails — clickable */}
                  {product.images.length > 1 && (
                    <div style={thumbRow}>
                      {product.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          style={{
                            ...thumb,
                            border: i === activeIndex
                              ? "2px solid #2563eb"
                              : "2px solid transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveImg(product.id, i)}
                        />
                      ))}
                    </div>
                  )}

                  <h3 style={cardName}>{product.name}</h3>
                  <p style={cardDesc}>{product.description}</p>
                  <p style={cardMeta}>
                    <strong>Sizes:</strong> {product.sizes.join(", ") || "—"}
                  </p>
                  <p style={cardMeta}>
                    <strong>Box Qty:</strong> {product.boxQuantity} pcs
                  </p>

                  {/* Pricing */}
                  <div style={priceBox}>
                    {[
                      ["Whole Seller", product.pricing.wholeSeller],
                      ["Semi Whole Seller", product.pricing.semiWholeSeller],
                      ["Retailer", product.pricing.retailer],
                    ].map(([label, val]) => (
                      <div key={label as string} style={priceRow}>
                        <span style={priceLabel}>{label}</span>
                        <span style={priceVal}>₹{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={cardActions}>
                    <button style={editBtn} onClick={() => handleEdit(product)}>
                      ✎ Edit
                    </button>
                    <button style={deleteBtn} onClick={() => handleDelete(product)}>
                      🗑 Delete
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MODAL — Add / Edit
        ══════════════════════════════════════════════ */}
        {showModal && (
          <div style={overlay} onClick={() => !uploadingImages && setShowModal(false)}>
            <div style={modal} onClick={e => e.stopPropagation()}>

              {showPreview ? (
                /* ── Preview ── */
                <>
                  <div style={modalHeader}>
                    <span style={modalTitleStyle}>Preview</span>
                    <button style={closeBtn} onClick={() => setShowModal(false)}>✕</button>
                  </div>

                  <div style={{ ...card, boxShadow: "none", border: "1px solid #e2e8f0" }}>
                    {formData.images[0]
                      ? <img src={formData.images[0]} style={mainImage} alt="" />
                      : <div style={imagePlaceholder}>👕</div>
                    }
                    {formData.images.length > 1 && (
                      <div style={thumbRow}>
                        {formData.images.map((img, i) => (
                          <img key={i} src={img} style={thumb} alt="" />
                        ))}
                      </div>
                    )}
                    <h3 style={cardName}>{formData.name || "—"}</h3>
                    <p style={cardDesc}>{formData.description || "—"}</p>
                    <p style={cardMeta}><strong>Sizes:</strong> {formData.sizes.join(", ") || "—"}</p>
                    <p style={cardMeta}><strong>Box Qty:</strong> {formData.boxQuantity} pcs</p>
                    <div style={priceBox}>
                      {[
                        ["Whole Seller", formData.pricing.wholeSeller],
                        ["Semi Whole Seller", formData.pricing.semiWholeSeller],
                        ["Retailer", formData.pricing.retailer],
                      ].map(([label, val]) => (
                        <div key={label as string} style={priceRow}>
                          <span style={priceLabel}>{label}</span>
                          <span style={priceVal}>₹{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={modalFooter}>
                    <button style={cancelBtn} onClick={() => setShowPreview(false)}>
                      ← Back to Edit
                    </button>
                    <button style={primaryBtn} onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : editingId ? "Update" : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                /* ── Form ── */
                <>
                  <div style={modalHeader}>
                    <span style={modalTitleStyle}>
                      {editingId ? "Edit Product" : "Add Product"}
                    </span>
                    <button
                      style={closeBtn}
                      onClick={() => !uploadingImages && setShowModal(false)}
                    >✕</button>
                  </div>

                  {formError && (
                    <div style={{ ...errorBanner, marginBottom: 12 }}>{formError}</div>
                  )}

                  {/* Name */}
                  <label style={fieldLabel}>Product Name *</label>
                  <input
                    style={input}
                    placeholder="e.g. White Premium T-Shirt"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />

                  {/* Description */}
                  <label style={fieldLabel}>Description</label>
                  <textarea
                    style={{ ...input, height: 70, resize: "vertical" }}
                    placeholder="Describe the product..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />

                  {/* Box Quantity */}
                  <label style={fieldLabel}>Pieces per Box *</label>
                  <input
                    type="number"
                    style={input}
                    placeholder="12"
                    min={1}
                    value={formData.boxQuantity}
                    onChange={e => setFormData({ ...formData, boxQuantity: Number(e.target.value) })}
                  />

                  {/* ── Image Upload ── */}
                  <label style={fieldLabel}>
                    Product Images
                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6, textTransform: "none" }}>
                      (max 10 images · 10 MB each · JPG / PNG / WEBP)
                    </span>
                  </label>

                  {/* Drop zone */}
                  <div
                    style={{
                      ...uploadZone,
                      borderColor: uploadingImages ? "#2563eb" : "#cbd5e1",
                      cursor: uploadingImages ? "not-allowed" : "pointer",
                    }}
                    onClick={() => !uploadingImages && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                    />
                    {uploadingImages ? (
                      <div style={{ textAlign: "center" }}>
                        <div style={uploadSpinner} />
                        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                          Uploading to Cloudinary...
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 30 }}>📁</div>
                        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                          Click to select images
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                          {formData.images.length} / 10 uploaded
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload progress */}
                  {uploadProgress.length > 0 && (
                    <div style={progressBox}>
                      {uploadProgress.map((msg, i) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>{msg}</div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded images preview with remove button */}
                  {formData.images.length > 0 && (
                    <>
                      <div style={thumbRow}>
                        {formData.images.map((img, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img
                              src={img}
                              style={{ ...thumb, width: 70, height: 70 }}
                              alt=""
                            />
                            {/* Number badge */}
                            <div style={orderBadge}>{i + 1}</div>
                            {/* Remove button — deletes from Cloudinary */}
                            <button
                              style={removeImgBtn}
                              onClick={() => removeImage(i)}
                              title="Remove image"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                        First image is the main photo. Clicking ✕ removes it from Cloudinary permanently.
                      </p>
                    </>
                  )}

                  {/* Sizes */}
                  <label style={{ ...fieldLabel, marginTop: 14 }}>Available Sizes</label>

                  {/* Quick size toggle buttons */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {["S", "M", "L", "XL", "XXL", "3XL"].map(s => (
                      <button
                        key={s}
                        style={quickSizeBtn(formData.sizes.includes(s))}
                        onClick={() => {
                          if (formData.sizes.includes(s)) removeSize(s);
                          else setFormData({ ...formData, sizes: [...formData.sizes, s] });
                        }}
                      >{s}</button>
                    ))}
                  </div>

                  {/* Custom size input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...input, flex: 1, marginTop: 0 }}
                      placeholder="Custom size e.g. 38, 40..."
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addSize()}
                    />
                    <button style={addBtn} onClick={addSize}>Add</button>
                  </div>

                  {/* Selected sizes as chips */}
                  {formData.sizes.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {formData.sizes.map(s => (
                        <span key={s} style={sizeChip}>
                          {s}
                          <span style={sizeChipX} onClick={() => removeSize(s)}>×</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pricing */}
                  <label style={{ ...fieldLabel, marginTop: 14 }}>
                    Pricing by Customer Type (₹) *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Whole Seller", key: "wholeSeller" },
                      { label: "Semi Whole", key: "semiWholeSeller" },
                      { label: "Retailer", key: "retailer" },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label style={subLabel}>{label}</label>
                        <input
                          type="number"
                          style={input}
                          placeholder="0"
                          min={0}
                          value={(formData.pricing as any)[key]}
                          onChange={e => setFormData({
                            ...formData,
                            pricing: { ...formData.pricing, [key]: Number(e.target.value) },
                          })}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Footer buttons */}
                  <div style={modalFooter}>
                    <button
                      style={cancelBtn}
                      onClick={() => !uploadingImages && setShowModal(false)}
                      disabled={saving || uploadingImages}
                    >
                      Cancel
                    </button>
                    <button
                      style={secondaryBtn}
                      onClick={() => setShowPreview(true)}
                      disabled={uploadingImages}
                    >
                      Preview
                    </button>
                    <button
                      style={primaryBtn}
                      onClick={handleSave}
                      disabled={saving || uploadingImages}
                    >
                      {saving ? "Saving..." : editingId ? "Update" : "Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </Dashboard>
  );
};

/* ════════════════════════════════
   STYLES
════════════════════════════════ */
const page: React.CSSProperties = { padding: 24, minHeight: "100vh", background: "#f8fafc" };
const pageHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 };
const pageTitle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" };
const pageSubtitle: React.CSSProperties = { margin: "4px 0 0", fontSize: 13, color: "#64748b" };
const errorBanner: React.CSSProperties = { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13 };
const emptyState: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", padding: 60 };
const loadingWrap: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300 };
const spinnerStyle: React.CSSProperties = { width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%" };

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 };
const card: React.CSSProperties = { background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" };
const mainImage: React.CSSProperties = { width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 8 };
const imagePlaceholder: React.CSSProperties = { width: "100%", height: 200, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 8 };
const thumbRow: React.CSSProperties = { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" };
const thumb: React.CSSProperties = { width: 50, height: 50, objectFit: "cover", borderRadius: 6 };
const cardName: React.CSSProperties = { margin: "8px 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" };
const cardDesc: React.CSSProperties = { margin: "0 0 6px", fontSize: 12, color: "#64748b" };
const cardMeta: React.CSSProperties = { margin: "2px 0", fontSize: 12, color: "#374151" };
const priceBox: React.CSSProperties = { background: "#f8fafc", padding: "10px 12px", borderRadius: 8, marginTop: 8, border: "1px solid #e2e8f0" };
const priceRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
const priceLabel: React.CSSProperties = { fontSize: 12, color: "#64748b" };
const priceVal: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#0f172a" };
const cardActions: React.CSSProperties = { display: "flex", gap: 8, marginTop: 12 };
const editBtn: React.CSSProperties = { flex: 1, padding: "7px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };
const deleteBtn: React.CSSProperties = { flex: 1, padding: "7px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modal: React.CSSProperties = { background: "#fff", padding: 20, borderRadius: 14, width: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" };
const modalHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" };
const modalTitleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#0f172a" };
const modalFooter: React.CSSProperties = { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 12, borderTop: "1px solid #f1f5f9" };
const closeBtn: React.CSSProperties = { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" };

const input: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 6, fontSize: 13, color: "#0f172a", boxSizing: "border-box" };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 14 };
const subLabel: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 };

const uploadZone: React.CSSProperties = { border: "2px dashed #cbd5e1", borderRadius: 10, padding: "20px 16px", marginTop: 8, background: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 80, transition: "border-color 0.2s" };
const uploadSpinner: React.CSSProperties = { width: 28, height: 28, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto" };
const progressBox: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginTop: 8 };
const orderBadge: React.CSSProperties = { position: "absolute", top: -4, left: -4, width: 18, height: 18, background: "#2563eb", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };
const removeImgBtn: React.CSSProperties = { position: "absolute", top: -6, right: -6, width: 20, height: 20, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" };

const sizeChip: React.CSSProperties = { padding: "3px 10px", background: "#e0e7ff", color: "#4f46e5", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 };
const sizeChipX: React.CSSProperties = { cursor: "pointer", color: "#6366f1", fontWeight: 800, fontSize: 14 };
const quickSizeBtn = (selected: boolean): React.CSSProperties => ({
  padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 600,
  background: selected ? "#4f46e5" : "#f1f5f9",
  color: selected ? "#fff" : "#475569",
  border: selected ? "1px solid #4f46e5" : "1px solid #e2e8f0",
});

const primaryBtn: React.CSSProperties = { padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 };
const secondaryBtn: React.CSSProperties = { padding: "8px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const cancelBtn: React.CSSProperties = { padding: "8px 16px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const addBtn: React.CSSProperties = { padding: "8px 14px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };

export default AddProduct;