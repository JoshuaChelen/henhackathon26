import { createFileRoute, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const Route = createFileRoute('/report')({
  component: ReportPage,
})

interface Pothole {
  id: string;
  image_url: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  resolved_count: number;
  address?: string;
}

function ReportPage() {
  const location = useLocation()
  
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(
    (location.state as { pothole?: Pothole })?.pothole || null
  )
  
  const [allPotholes, setAllPotholes] = useState<Pothole[]>([])
  const [generatedReport, setGeneratedReport] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('potholes_map_view')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        setAllPotholes(data as Pothole[]);
      }
    }
    fetchAll();
  }, []);

  useEffect(() => {
    async function fetchDetails() {
      if (!selectedPothole || selectedPothole.address) return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedPothole.latitude}&lon=${selectedPothole.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'TumbleTracker-Hackathon-App' // Nominatim requires a User-Agent
            }
          }
        );

        const data = await response.json();
        
        if (data && data.display_name) {
          setSelectedPothole(prev => prev ? { ...prev, address: data.display_name } : null);
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      }
    }

    if (selectedPothole) {
      fetchDetails();
    }
  }, [selectedPothole?.id]);

  const handleGenerateReport = async () => {
    if (!selectedPothole) return
    setIsGenerating(true)

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

      const locationString = selectedPothole.address || `${selectedPothole.latitude}, ${selectedPothole.longitude}`;

      const prompt = `
        You are an automated civic infrastructure reporting system. 
        Write a letter to the local Department of Public Works reporting a hazard.
        
        Details:
        - Hazard Type: Pothole
        - Severity: ${selectedPothole.severity.toUpperCase()}
        - Location: ${locationString}
        - Date Reported: ${new Date(selectedPothole.date).toLocaleDateString()}
        
        Requirements:
        - Mention this was detected via an automated user reported pothole reporting system.
        - Urge an inspection based on the severity.
        - Sign as "Tumble Tracker Automated Reporting System".
        - Keep it under 200 words.
        - Don't use any bold, underscore, or special formatting.
      `;

      const result = await model.generateContent(prompt)
      setGeneratedReport(result.response.text())
    } catch (error) {
      console.error(error)
      alert("Failed to reach Gemini. Check VITE_GEMINI_API_KEY.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <main className="max-w-4xl mx-auto w-full space-y-8">
        
        <section className="print:hidden bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold mb-4">Report Configuration</h1>
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Pothole to Report
            </label>
            <select 
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white"
              value={selectedPothole?.id || ''}
              onChange={(e) => setSelectedPothole(allPotholes.find(p => p.id === e.target.value) || null)}
            >
              <option value="">-- Choose from Database --</option>
              {allPotholes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.severity.toUpperCase()} Severity - {new Date(p.date).toLocaleDateString()} ({p.id.slice(0,8)})
                </option>
              ))}
            </select>

            {selectedPothole && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-4">
                <img src={selectedPothole.image_url} className="w-32 h-32 object-cover rounded-md" />
                <div className="text-sm">
                  <p><strong>Coordinates:</strong> {selectedPothole.latitude}, {selectedPothole.longitude}</p>
                  <p><strong>Severity:</strong> {selectedPothole.severity}</p>
                  <button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md font-bold disabled:bg-gray-400"
                  >
                    {isGenerating ? 'AI Drafting...' : 'Generate AI Letter'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {generatedReport && (
          <div className="bg-white p-12 shadow-2xl rounded-sm border-t-8 border-blue-900 print:shadow-none print:border-none">
            <div className="flex justify-between items-end border-b pb-4 mb-8">
              <div>
                <h2 className="text-3xl font-black text-blue-900">POTHOLE MAINTENANCE REQUEST</h2>
                <p className="text-gray-500 font-mono">ID: {selectedPothole?.id}</p>
              </div>
              <button onClick={handlePrint} className="print:hidden bg-green-600 text-white px-4 py-2 rounded font-bold">
                Save as PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 prose prose-blue whitespace-pre-wrap font-serif text-lg">
                {generatedReport}
              </div>
              <div className="space-y-4">
                <h4 className="font-bold uppercase text-xs text-gray-400 border-b pb-2">Evidence Attachment</h4>
                <img src={selectedPothole?.image_url} className="w-full rounded border" />
                <div className="bg-gray-50 p-4 text-xs font-mono space-y-1">
                  <p className="font-bold border-b pb-1 mb-2">LOCATION DATA</p>
                  <p><strong>ADDRESS:</strong> {selectedPothole?.address || "Fetching..."}</p>
                  <p><strong>LAT:</strong> {selectedPothole?.latitude}</p>
                  <p><strong>LNG:</strong> {selectedPothole?.longitude}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}