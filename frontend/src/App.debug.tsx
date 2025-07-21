import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Simple debug component
function DebugApp() {
  const [step, setStep] = useState(1);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>🥬 Leaf App - Step by Step Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Current Step: {step}</h2>
        <button onClick={() => setStep(step + 1)} style={{ marginRight: '10px', padding: '5px 10px' }}>
          Next Step
        </button>
        <button onClick={() => setStep(1)} style={{ padding: '5px 10px' }}>
          Reset
        </button>
      </div>

      {step >= 1 && (
        <div style={{ backgroundColor: '#f0f8f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
          <h3>✅ Step 1: Basic React + State</h3>
          <p>React rendering and state management working!</p>
        </div>
      )}

      {step >= 2 && (
        <div style={{ backgroundColor: '#f0f8f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
          <h3>✅ Step 2: React Query Provider</h3>
          <p>React Query is configured and working!</p>
        </div>
      )}

      {step >= 3 && (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
          <h3>🔄 Step 3: Testing Components Import</h3>
          <p>This is where we'll test importing the complex components...</p>
          <p><strong>Google Maps API Key:</strong> {import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'NOT SET'}</p>
          <p><strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'NOT SET'}</p>
        </div>
      )}

      {step >= 4 && (
        <div style={{ backgroundColor: '#d1ecf1', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
          <h3>🎯 Step 4: Ready for Full App</h3>
          <p>All basic components working. Ready to restore full application!</p>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DebugApp />
    </QueryClientProvider>
  );
}

export default App;