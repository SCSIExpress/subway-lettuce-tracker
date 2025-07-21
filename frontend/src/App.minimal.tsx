import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        backgroundColor: '#f0f8f0',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #4CAF50'
      }}>
        <h1 style={{ color: '#2E7D32', margin: '0 0 20px 0' }}>
          🥬 Leaf App - Debug Mode
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#388E3C' }}>✅ System Status</h2>
          <ul style={{ lineHeight: '1.6' }}>
            <li>✅ React is rendering successfully</li>
            <li>✅ JavaScript is executing</li>
            <li>✅ CSS styles are working</li>
            <li>✅ State management is functional</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>Interactive Test</h3>
          <p>Current count: <strong>{count}</strong></p>
          <button 
            onClick={() => setCount(count + 1)}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Click me! (+1)
          </button>
        </div>

        <div style={{ 
          backgroundColor: '#E8F5E8', 
          padding: '15px', 
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <h3>Next Steps:</h3>
          <ol>
            <li>If you can see this page, React is working correctly</li>
            <li>The white page issue was likely due to a component error</li>
            <li>Check the browser console (F12) for any error messages</li>
            <li>We can now restore the full application</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;