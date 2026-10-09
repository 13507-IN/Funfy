"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowDown, ArrowRight, Check, Heart, Menu, Search, ShoppingBag, Sparkles, Star, X } from "lucide-react";
import CartSidebar from "./CartSidebar";
import { useStickerStore } from "../store/useStickerStore";

const StudioEditor = dynamic(() => import("./StudioEditor"), {
  ssr: false,
  loading: () => (
    <div className="studio-loading">
      <div className="studio-loading-mark">F</div>
      <p>Setting up your creative space…</p>
    </div>
  ),
});

type Product = {
  id: string;
  name: string;
  label: string;
  category: string;
  art: "sun" | "star" | "cat" | "flower";
  accent: string;
  badge?: string;
};

const products: Product[] = [
  { id: "good-day", name: "Good Day Club", label: "A little sunshine, everywhere.", category: "Feel-good", art: "sun", accent: "#ffd45c", badge: "Fan favorite" },
  { id: "tiny-wonders", name: "Tiny Wonders", label: "For big dreamers and small spaces.", category: "Playful", art: "star", accent: "#d6c7ff", badge: "New" },
  { id: "catnap", name: "Catnap Society", label: "Low battery. High standards.", category: "Playful", art: "cat", accent: "#ffb4a2" },
  { id: "soft-spots", name: "Soft Spot", label: "A pocket-sized bunch of happy.", category: "Nature", art: "flower", accent: "#c8efb7" },
];

const categories = ["Everything", "Feel-good", "Playful", "Nature"];

function stickerSvg(art: Product["art"], accent: string) {
  const artMarkup = {
    sun: `<circle cx="160" cy="126" r="57" fill="${accent}"/><path d="M160 48v-17m0 190v-17m78-78h17m-190 0h17m133-55 12-12m-134 134 12-12m110 0 12 12M94 62l12 12" stroke="#f07c57" stroke-width="10" stroke-linecap="round"/><circle cx="141" cy="121" r="5" fill="#302847"/><circle cx="179" cy="121" r="5" fill="#302847"/><path d="M145 145q15 15 30 0" fill="none" stroke="#302847" stroke-width="5" stroke-linecap="round"/><text x="160" y="210" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#302847">GOOD DAY</text>`,
    star: `<path d="m160 48 25 51 56 8-41 39 10 56-50-27-50 27 10-56-41-39 56-8z" fill="${accent}" stroke="#8f69d8" stroke-width="7" stroke-linejoin="round"/><circle cx="146" cy="126" r="5" fill="#302847"/><circle cx="174" cy="126" r="5" fill="#302847"/><path d="M148 144q12 12 24 0" fill="none" stroke="#302847" stroke-width="4" stroke-linecap="round"/><path d="m83 68 5 13 13 5-13 5-5 13-5-13-13-5 13-5zM233 156l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff"/>`,
    cat: `<path d="m99 91 9-46 39 27q13-4 26 0l39-27 9 46q16 20 11 47-8 47-73 48-65-1-73-48-5-27 13-47" fill="${accent}" stroke="#e77a71" stroke-width="7" stroke-linejoin="round"/><path d="M135 126h1m48 0h1" stroke="#302847" stroke-width="12" stroke-linecap="round"/><path d="M151 145q9 9 18 0m-9-1v9m-22 3-22 4m22 3-18 10m64-17 22 4m-22 3 18 10" fill="none" stroke="#302847" stroke-width="4" stroke-linecap="round"/><path d="m154 139 6 6 6-6z" fill="#e77a71"/>`,
    flower: `<path d="M160 71c-24-44-70-9-30 21-51-6-47 52 6 45-37 37 9 73 29 23 20 50 66 14 29-23 53 7 57-51 6-45 40-30-6-65-30-21" fill="${accent}" stroke="#6da16b" stroke-width="7"/><circle cx="160" cy="128" r="28" fill="#f6bb55" stroke="#e39734" stroke-width="5"/><circle cx="151" cy="124" r="3.5" fill="#302847"/><circle cx="169" cy="124" r="3.5" fill="#302847"/><path d="M153 138q7 7 14 0" fill="none" stroke="#302847" stroke-width="3.5" stroke-linecap="round"/>`,
  }[art];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="280" viewBox="0 0 320 280"><path d="M160 18c-14 0-25 10-32 22-13-6-29-5-39 5s-11 26-5 39c-12 7-21 19-21 34s9 27 21 34c-6 13-5 29 5 39s26 11 39 5c7 12 19 21 34 21s27-9 34-21c13 6 29 5 39-5s11-26 5-39c12-7 21-19 21-34s-9-27-21-34c6-13 5-29-5-39s-26-11-39-5c-7-12-19-22-36-22z" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>${artMarkup}</svg>`;
}

function ProductArtwork({ product }: { product: Product }) {
  return (
    <Image
      src={productDataUrl(product)}
      alt={`${product.name} sticker artwork`}
      width={320}
      height={280}
      unoptimized
      className="product-artwork"
    />
  );
}

function productDataUrl(product: Product) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(stickerSvg(product.art, product.accent))}`;
}

function Logo() {
  return (
    <a href="#top" className="shop-logo" aria-label="Funfy home">
      <span className="shop-logo-mark">F</span>
      <span>funfy<span className="shop-logo-dot">.</span></span>
    </a>
  );
}

export default function ShopHome() {
  const [isStudioOpen, setStudioOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Everything");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartItems, addToCart, setCartOpen } = useStickerStore();

  useEffect(() => {
    void useStickerStore.persist.rehydrate();
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "Everything" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.label} ${product.category}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  }), [activeCategory, searchQuery]);

  const startDesigning = () => {
    setStudioOpen(true);
    setMobileMenuOpen(false);
  };

  const addProduct = (product: Product) => {
    addToCart({
      name: product.name,
      quantity: 25,
      price: 0.5,
      dataUrl: productDataUrl(product),
      unitLabel: "stickers",
      minQuantity: 25,
      details: "3 in · Matte preference",
    });
    setToast(`${product.name} added to your bag`);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (isStudioOpen) {
    return <StudioEditor onBack={() => setStudioOpen(false)} />;
  }

  return (
    <main id="top" className="shop-shell">
      <CartSidebar />
      <header className="shop-header">
        <div className="shop-header-inner">
          <Logo />
          <nav className={`shop-nav ${mobileMenuOpen ? "shop-nav-open" : ""}`} aria-label="Main navigation">
            <a href="#shop" onClick={() => setMobileMenuOpen(false)}>Shop stickers</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </nav>
          <div className="shop-header-actions">
            <button className="shop-cart-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartItems} stickers`}>
              <ShoppingBag size={19} />
              <span className="shop-cart-label">Bag</span>
              <span className="shop-cart-count">{cartItems}</span>
            </button>
            <button className="shop-header-cta" onClick={startDesigning}>Make a sticker <ArrowRight size={16} /></button>
            <button className="shop-menu-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero-grid">
          <div className="shop-hero-copy">
            <div className="shop-eyebrow"><span className="eyebrow-spark">✦</span> Little things. Big personality.</div>
            <h1>Make your<br />world <span>a little</span><br /><em>more you.</em></h1>
            <p>Turn your doodles, photos, and wildly specific ideas into stickers worth keeping. Start with a design or grab a little inspiration.</p>
            <div className="shop-hero-actions">
              <button className="button-primary" onClick={startDesigning}>Create your sticker <ArrowRight size={18} /></button>
              <a className="button-link" href="#shop">Shop the collection <ArrowDown size={16} /></a>
            </div>
            <div className="shop-hero-note"><span className="note-avatar">✿</span><span><strong>Made to feel like you.</strong><br />Easy to design, fun to share.</span></div>
          </div>

          <div className="hero-art" aria-label="Playful sticker collage">
            <div className="hero-art-sun"><span>GOOD<br />VIBES</span><i>✦</i></div>
            <div className="hero-art-flower"><span>✿</span></div>
            <div className="hero-art-star"><span>stay<br />curious</span></div>
            <div className="hero-art-heart"><Heart size={46} fill="currentColor" strokeWidth={0} /></div>
            <div className="hero-art-tape">PEEL • STICK • REPEAT</div>
            <span className="hero-art-spark hero-spark-one">✦</span>
            <span className="hero-art-spark hero-spark-two">✳</span>
            <span className="hero-art-spark hero-spark-three">✦</span>
            <div className="hero-art-caption"><Sparkles size={16} /> your next favorite thing</div>
          </div>
        </div>
        <div className="shop-trust-strip">
          <span><Check size={16} /> Make it from scratch</span>
          <span><Check size={16} /> Make it yours</span>
          <span><Check size={16} /> Keep your design close</span>
        </div>
      </section>

      <section id="shop" className="shop-products-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">The happy little collection</div>
            <h2>Pick a favorite.<br /><span>Make it yours.</span></h2>
          </div>
          <p>Need a starting point? Choose a design, add it to your bag, or jump into the studio and build something totally your own.</p>
        </div>

        <div className="shop-tools">
          <div className="category-pills" role="group" aria-label="Filter stickers by category">
            {categories.map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? "category-pill active" : "category-pill"}>
                {category}
              </button>
            ))}
          </div>
          <label className="shop-search">
            <Search size={17} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Find your vibe" aria-label="Search stickers" />
            {searchQuery && <button onClick={() => setSearchQuery("")} aria-label="Clear search"><X size={16} /></button>}
          </label>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                <div className={`product-art-wrap product-art-${product.art}`} style={{ backgroundColor: `${product.accent}55` }}>
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <span className="product-index">0{index + 1}</span>
                  <ProductArtwork product={product} />
                  <span className="art-spark">✦</span>
                </div>
                <div className="product-info">
                  <div className="product-category">{product.category}</div>
                  <div className="product-title-row">
                    <div><h3>{product.name}</h3><p>{product.label}</p></div>
                    <span className="product-price">$12.50</span>
                  </div>
                  <div className="product-buy-row">
                    <span>25 stickers · $0.50 each</span>
                    <button onClick={() => addProduct(product)} aria-label={`Add ${product.name} to bag`}>Add to bag <ArrowRight size={15} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="shop-empty">
            <span>✦</span>
            <h3>No stickers found</h3>
            <p>Try another search, or create your own in the studio.</p>
            <button className="button-primary" onClick={startDesigning}>Make one instead <ArrowRight size={17} /></button>
          </div>
        )}

        <div className="custom-banner">
          <div className="custom-banner-art"><Star size={34} fill="currentColor" /><span>YOUR<br />IDEA</span></div>
          <div><p className="section-kicker">Nothing here quite you?</p><h3>Your imagination has the aux.</h3><p>Upload a photo, add a little text, pick your colors. The studio is yours.</p></div>
          <button className="button-dark" onClick={startDesigning}>Open the sticker studio <ArrowRight size={18} /></button>
        </div>
      </section>

      <section id="how-it-works" className="how-section">
        <div className="section-heading how-heading">
          <div><div className="section-kicker">Easy as peel, stick, repeat</div><h2>From “what if?”<br /><span>to “look at that.”</span></h2></div>
          <p>No complicated design software, no blank-page panic. Just a few joyful steps between your idea and your next favorite sticker.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon step-icon-pink"><Sparkles size={26} /></div><h3>Start with a spark</h3><p>Pick a favorite from the collection or open the studio and start with a blank canvas.</p></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon step-icon-yellow"><Heart size={25} /></div><h3>Make it yours</h3><p>Add a photo, playful shapes, bold type, and your own color story. The canvas saves as you go.</p></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon step-icon-green"><ShoppingBag size={25} /></div><h3>Build your bag</h3><p>Choose a quantity and print preferences, then keep your picks together in your saved cart.</p></article>
        </div>
      </section>

      <section className="studio-cta">
        <div className="studio-cta-doodle">✿</div>
        <div><span className="section-kicker">Your turn, creator</span><h2>There’s a sticker<br />with your name on it.</h2><p>Probably literally, if you want. Let’s make it.</p></div>
        <button className="button-primary button-light" onClick={startDesigning}>Start creating <ArrowRight size={18} /></button>
      </section>

      <section id="faq" className="faq-section">
        <div className="faq-intro"><div className="section-kicker">A few good questions</div><h2>Before you<br /><span>get sticky.</span></h2><p>Want to know what happens next? Here are the helpful bits.</p></div>
        <div className="faq-list">
          <details><summary>Can I make a sticker from my own image?<span>+</span></summary><p>Yes. Open the studio, choose Upload image, and start customizing. You can also add text, shapes, and stickers from the built-in library.</p></details>
          <details><summary>Will my design be saved if I leave?<span>+</span></summary><p>Your cart is saved in this browser. The editor also keeps a local working copy for a limited time, so export a PNG if you want a file you can keep anywhere.</p></details>
          <details><summary>Can I place a real order today?<span>+</span></summary><p>The design and cart experience is ready to explore. Secure payment and print fulfillment still need to be connected before the site can accept or ship paid orders.</p></details>
        </div>
      </section>

      <footer className="shop-footer">
        <Logo />
        <p>Make little things that feel like you.</p>
        <div><a href="#shop">Shop</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a></div>
        <span>© {new Date().getFullYear()} Funfy. Made for your ideas.</span>
      </footer>

      {toast && (
        <div className="shop-toast" role="status">
          <span className="toast-check"><Check size={15} /></span>{toast}
          <button onClick={() => { setToast(""); setCartOpen(true); }}>View bag</button>
        </div>
      )}
    </main>
  );
}
