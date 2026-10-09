"use client";

import { useState } from "react";
import { X, ShoppingBag, CreditCard, Trash2, Plus, Minus, ShieldCheck, ArrowRight } from "lucide-react";
import { useStickerStore } from "../store/useStickerStore";
import Image from "next/image";

export default function CartSidebar() {
  const { cart, isCartOpen, setCartOpen, removeFromCart, updateCartQuantity } = useStickerStore();
  const [showCheckoutInfo, setShowCheckoutInfo] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const closeCart = () => {
    setShowCheckoutInfo(false);
    setCartOpen(false);
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={closeCart}
      />
      <div className="fixed right-0 top-0 h-full w-full md:w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-fuchsia-500" />
            Your Cart
          </h2>
          <button 
            onClick={closeCart}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                <div className="relative w-20 h-20 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-2 shrink-0">
                  <Image src={item.dataUrl} alt={item.name} width={80} height={80} unoptimized className="object-contain w-full h-full" />
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{item.name}</h3>
                      {item.details && <p className="mt-1 text-[11px] text-slate-500">{item.details}</p>}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title={`Remove ${item.name}`}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-slate-200 bg-white rounded-lg p-0.5">
                      <button
                        onClick={() => updateCartQuantity(item.id, -(item.minQuantity ?? 1))}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded transition"
                        title={`Decrease ${item.unitLabel ?? "quantity"}`}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-700">{item.quantity} {item.unitLabel ?? "stickers"}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.minQuantity ?? 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded transition"
                        title={`Increase ${item.unitLabel ?? "quantity"}`}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="text-fuchsia-600 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-slate-600">Total</span>
            <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>
          <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            Your bag is saved in this browser. Payment and print fulfillment are not connected yet.
          </p>
          <button 
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all disabled:opacity-50"
            disabled={cart.length === 0}
            onClick={() => setShowCheckoutInfo(true)}
          >
            <CreditCard size={20} />
            Checkout setup
          </button>
        </div>
      </div>
      {showCheckoutInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowCheckoutInfo(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="checkout-setup-title" className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck size={24} /></div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">No surprise charges</p>
            <h2 id="checkout-setup-title" className="text-2xl font-black tracking-tight text-slate-950">Your bag is ready.</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">This project does not have a payment provider or print partner connected yet, so it cannot safely accept or fulfill an order. Your bag is saved here while checkout is set up.</p>
            <div className="my-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2 font-bold text-slate-800">To turn on real orders:</p>
              <ul className="space-y-2">
                <li>• Connect a payment provider (for example Stripe).</li>
                <li>• Choose print, shipping, and order-fulfillment settings.</li>
                <li>• Store each customer’s print file securely.</li>
              </ul>
            </div>
            <button onClick={() => setShowCheckoutInfo(false)} className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 font-bold text-white transition hover:bg-fuchsia-700">
              Keep exploring <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
