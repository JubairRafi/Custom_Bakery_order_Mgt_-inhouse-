'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
    useEffect(() => {
        window.print();
    }, []);

    return (
        <button
            onClick={() => window.print()}
            className="print:hidden inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700"
        >
            <Printer size={16} />
            Print / Save as PDF
        </button>
    );
}
