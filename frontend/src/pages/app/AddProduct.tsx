import React, { useState } from "react";
import Dashboard from "../Dashboard";

interface Product {
  id: number;
  name: string;
  images: string[];
  description: string;
  sizes: string[];
  boxQuantity: number;
  pricing: {
    wholeSeller: number;
    semiWholeSeller: number;
    retailer: number;
  };
}

const AddProduct = () => {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "White T-Shirt",
      images: [
        "https://picsum.photos/300/300?random=1",
        "https://picsum.photos/300/300?random=2",
      ],
      description: "Premium cotton white t-shirt.",
      sizes: ["S", "M", "L", "XL"],
      boxQuantity: 12,
      pricing: {
        wholeSeller: 200,
        semiWholeSeller: 225,
        retailer: 250,
      },
    },
    {
      id: 2,
      name: "Black Hoodie",
      images: [
        "https://picsum.photos/300/300?random=3",
        "https://picsum.photos/300/300?random=4",
      ],
      description: "Winter hoodie with fleece lining.",
      sizes: ["M", "L", "XL"],
      boxQuantity: 10,
      pricing: {
        wholeSeller: 500,
        semiWholeSeller: 550,
        retailer: 600,
      },
    },
  ]);

  const emptyProduct: Product = {
    id: 0,
    name: "",
    images: [],
    description: "",
    sizes: [],
    boxQuantity: 12,
    pricing: {
      wholeSeller: 0,
      semiWholeSeller: 0,
      retailer: 0,
    },
  };

  const [formData, setFormData] = useState<Product>(emptyProduct);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newSize, setNewSize] = useState("");
  // ADDED: track active thumbnail per card (keyed by product id)
  const [activeImgMap, setActiveImgMap] = useState<Record<number, number>>({});
  // ADDED: preview mode inside modal
  const [showPreview, setShowPreview] = useState(false);

  // Open Add
  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setShowPreview(false); // ADDED
    setShowModal(true);
  };

  // Open Edit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowPreview(false); // ADDED
    setShowModal(true);
  };

  // Save Product
  const handleSave = () => {
    if (!formData.name) return alert("Product name required");

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? formData : p))
      );
    } else {
      setProducts((prev) => [
        ...prev,
        { ...formData, id: Date.now() },
      ]);
    }

    setShowModal(false);
  };

  // Delete Product
  const handleDelete = (id: number) => {
    if (window.confirm("Delete this product?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Upload Images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));

    setFormData({
      ...formData,
      images: [...formData.images, ...urls],
    });
  };

  // Remove Image
  const removeImage = (index: number) => {
    const updated = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updated });
  };

  // Add Size
  const addSize = () => {
    if (!newSize) return;
    setFormData({
      ...formData,
      sizes: [...formData.sizes, newSize],
    });
    setNewSize("");
  };

  // ADDED: Remove size chip
  const removeSize = (size: string) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((s) => s !== size),
    });
  };

  // ADDED: Switch main image on card
  const setActiveImg = (productId: number, index: number) => {
    setActiveImgMap((prev) => ({ ...prev, [productId]: index }));
  };

  return (
    <Dashboard>
      <div style={{ padding: 20 }}>
        <div style={header}>
          <h2>Products</h2>
          <button style={primaryBtn} onClick={handleAddNew}>
            + Add Product
          </button>
        </div>

        {/* Grid */}
        <div style={grid}>
          {products.map((product) => {
            const activeIndex = activeImgMap[product.id] ?? 0; // ADDED
            return (
              <div key={product.id} style={card}>
                {/* CHANGED: main image now uses activeIndex */}
                {product.images[activeIndex] && (
                  <img src={product.images[activeIndex]} style={mainImage} alt={product.name} />
                )}

                {/* CHANGED: thumbnails are now clickable and highlight the active one */}
                <div style={thumbContainer}>
                  {product.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      style={{
                        ...thumbnail,
                        border: i === activeIndex ? "2px solid #2563eb" : "2px solid transparent", // ADDED active border
                        cursor: "pointer", // ADDED
                      }}
                      onClick={() => setActiveImg(product.id, i)} // ADDED
                    />
                  ))}
                </div>

                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p><strong>Sizes:</strong> {product.sizes.join(", ")}</p>
                <p><strong>Box Qty:</strong> {product.boxQuantity}</p>

                <div style={priceBox}>
                  <p>Whole Seller: ₹{product.pricing.wholeSeller}</p>
                  <p>Semi Whole Seller: ₹{product.pricing.semiWholeSeller}</p>
                  <p>Retailer: ₹{product.pricing.retailer}</p>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button style={editBtn} onClick={() => handleEdit(product)}>
                    Edit
                  </button>
                  <button
                    style={deleteBtn}
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        {showModal && (
          <div style={overlay}>
            <div style={modal}>

              {/* ADDED: Preview mode */}
              {showPreview ? (
                <>
                  <h3>Preview</h3>
                  {/* Preview card — same layout as product card */}
                  <div style={{ ...card, boxShadow: "none", border: "1px solid #e2e8f0" }}>
                    {formData.images[0] && (
                      <img src={formData.images[0]} style={mainImage} alt={formData.name} />
                    )}
                    <div style={thumbContainer}>
                      {formData.images.map((img, i) => (
                        <img key={i} src={img} style={thumbnail} />
                      ))}
                    </div>
                    <h3>{formData.name || "—"}</h3>
                    <p>{formData.description || "—"}</p>
                    <p><strong>Sizes:</strong> {formData.sizes.join(", ") || "—"}</p>
                    <p><strong>Box Qty:</strong> {formData.boxQuantity}</p>
                    <div style={priceBox}>
                      <p>Whole Seller: ₹{formData.pricing.wholeSeller}</p>
                      <p>Semi Whole Seller: ₹{formData.pricing.semiWholeSeller}</p>
                      <p>Retailer: ₹{formData.pricing.retailer}</p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginTop: 10 }}>
                    <button onClick={() => setShowPreview(false)} style={{ marginRight: 8 }}>← Back to Edit</button>
                    <button style={primaryBtn} onClick={handleSave}>Save</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>{editingProduct ? "Edit Product" : "Add Product"}</h3>
                  <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "10px 0" }} />

                  {/* Product Name */}
                  <label style={fieldLabel}>Product Name <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    placeholder="e.g. Plain White Tee"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    style={input}
                  />

                  {/* Description */}
                  <label style={fieldLabel}>Description</label>
                  <textarea
                    placeholder="Brief product description…"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    style={input}
                  />

                  {/* Box Quantity */}
                  <label style={fieldLabel}>Pieces per Box</label>
                  <input type="number" placeholder="Box Quantity"
                    value={formData.boxQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, boxQuantity: Number(e.target.value) })
                    }
                    style={input}
                  />

                  {/* Images */}
                  <label style={fieldLabel}>Product Images</label>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} />

                  {/* Image Preview */}
                  <div style={thumbContainer}>
                    {formData.images.map((img, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={img} style={thumbnail} />
                        <button
                          style={removeImgBtn}
                          onClick={() => removeImage(i)}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Sizes */}
                  <label style={fieldLabel}>Available Sizes</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      placeholder="e.g. S, M, L, XL, 38…"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSize()}
                      style={input}
                    />
                    <button onClick={addSize}>Add</button>
                  </div>

                  {/* sizes as removable chips */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {formData.sizes.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: "3px 8px",
                          background: "#e2e8f0",
                          borderRadius: 12,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {s}
                        <span
                          style={{ cursor: "pointer", color: "#dc2626", fontWeight: "bold" }}
                          onClick={() => removeSize(s)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Pricing */}
                  <label style={{ ...fieldLabel, marginTop: 10 }}>Pricing by Customer Type (₹)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                    <div>
                      <label style={subLabel}>Whole Seller</label>
                      <input type="number" placeholder="0"
                        value={formData.pricing.wholeSeller}
                        onChange={(e) =>
                          setFormData({ ...formData, pricing: { ...formData.pricing, wholeSeller: Number(e.target.value) } })
                        }
                        style={input}
                      />
                    </div>
                    <div>
                      <label style={subLabel}>Semi Whole</label>
                      <input type="number" placeholder="0"
                        value={formData.pricing.semiWholeSeller}
                        onChange={(e) =>
                          setFormData({ ...formData, pricing: { ...formData.pricing, semiWholeSeller: Number(e.target.value) } })
                        }
                        style={input}
                      />
                    </div>
                    <div>
                      <label style={subLabel}>Retailer</label>
                      <input type="number" placeholder="0"
                        value={formData.pricing.retailer}
                        onChange={(e) =>
                          setFormData({ ...formData, pricing: { ...formData.pricing, retailer: Number(e.target.value) } })
                        }
                        style={input}
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginTop: 10 }}>
                    <button onClick={() => setShowModal(false)} style={{ marginRight: 8 }}>Cancel</button>
                    {/* ADDED: Preview button */}
                    <button onClick={() => setShowPreview(true)} style={{ marginRight: 8 }}>Preview</button>
                    <button style={primaryBtn} onClick={handleSave}>
                      Save
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

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 20,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
  gap: 20,
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: 15,
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const mainImage: React.CSSProperties = {
  width: "100%",
  height: 200,
  objectFit: "cover",
  borderRadius: 6,
};

const thumbContainer: React.CSSProperties = {
  display: "flex",
  gap: 5,
  marginTop: 5,
  flexWrap: "wrap",
};

const thumbnail: React.CSSProperties = {
  width: 50,
  height: 50,
  objectFit: "cover",
  borderRadius: 4,
};

const priceBox: React.CSSProperties = {
  background: "#f1f5f9",
  padding: 8,
  borderRadius: 6,
  marginTop: 8,
};

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modal: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  width: 400,
  maxHeight: "90vh",
  overflowY: "auto",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 6,
  marginTop: 8,
};

const primaryBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const editBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  marginRight: 5,
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginTop: 12,
  marginBottom: 2,
};

const subLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  marginBottom: 2,
};

const removeImgBtn: React.CSSProperties = {
  position: "absolute",
  top: -5,
  right: -5,
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
};

export default AddProduct;