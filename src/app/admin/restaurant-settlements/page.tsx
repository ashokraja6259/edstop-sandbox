// FILE: src/app/admin/restaurant-settlements/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RestaurantSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('restaurant_settlements')
        .select(`
          *,
          restaurants ( name )
        `)
        .order('paid_at', { ascending: false });

      setSettlements(data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const downloadCSV = () => {
    if (!settlements.length) return;

    const header = [
      "Restaurant",
      "Week Start",
      "Amount Paid",
      "Paid At"
    ];

    const rows = settlements.map(s => [
      s.restaurants?.name,
      new Date(s.week_start).toLocaleDateString(),
      s.amount_paid,
      new Date(s.paid_at).toLocaleString()
    ]);

    const csvContent =
      [header, ...rows]
        .map(row => row.join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "restaurant-settlements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">
        Restaurant Settlement History
      </h1>

      <button
        onClick={downloadCSV}
        className="mb-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
      >
        Download CSV Report
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : settlements.length === 0 ? (
        <p>No settlements yet.</p>
      ) : (
        <div className="bg-white shadow rounded-xl p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th>Restaurant</th>
                <th>Week</th>
                <th>Amount Paid</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s, i) => (
                <tr key={i} className="border-b">
                  <td>{s.restaurants?.name}</td>
                  <td>{new Date(s.week_start).toLocaleDateString()}</td>
                  <td className="font-semibold text-green-600">
                    ₹{s.amount_paid}
                  </td>
                  <td>{new Date(s.paid_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}