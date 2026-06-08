"use client";

import { X, ShoppingBag, CreditCard } from "lucide-react";
import { useStickerStore } from "../store/useStickerStore";
import Image from "next/image";

export default function CartSidebar() {
  const { cart, isCartOpen, setCartOpen } = useStickerStore();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setCartOpen(false)}
      />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-fuchsia-500" />
            Your Cart
          </h2>
          <button 
            onClick={() => setCartOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                  <Image src={item.dataUrl} alt={item.name} width={80} height={80} className="object-contain w-full h-full" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                  <p className="text-slate-500 text-sm">Qty: {item.quantity}</p>
                  <p className="text-fuchsia-600 font-bold mt-1">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-6">
            <span className="font-semibold text-slate-600">Total</span>
            <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>
          <button 
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all disabled:opacity-50"
            disabled={cart.length === 0}
            onClick={() => alert("Checkout Flow Simulated! Ready to build real integration.")}
          >
            <CreditCard size={20} />
            Secure Checkout
          </button>
        </div>
      </div>
    </>
  );
}
