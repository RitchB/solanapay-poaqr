"use client";

import { useEffect, useRef, RefObject } from 'react';
import Link from 'next/link';

import { createQR } from "@solana/pay";
const SOLANA_PAY_URL = "solana:http://localhost:3000/api/poaqr";

export default function Home() {
  const qrRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qr = createQR(SOLANA_PAY_URL, 360, 'white', 'orange');

    // Set the generated QR code on the QR ref element
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qr.append(qrRef.current);
      console.log("appended");
    }
  }, []);

  return (
    <div className="md:hero mx-auto p-4 flex justify-center items-center h-screen">
      <div className="text-center md:hero-content flex flex-col">
        Qr POA
        <div className='mt-6'>
          <div className='text-sm font-normal align-bottom text-center text-slate-600 mt-4'>Scan this</div>

          <div ref={qrRef}></div>

        </div>
      </div>
    </div>
  );
}