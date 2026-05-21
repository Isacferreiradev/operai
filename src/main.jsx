/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ops-manager.jsx'
import Auth from './Auth.jsx'
import { supabase } from './supabase'

function Root() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appState, setAppState] = useState(null)
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      // Fetch cloud state when session is active
      const fetchState = async () => {
        setSyncError(null);
        const { data, error } = await supabase
          .from('user_app_state')
          .select('app_state')
          .eq('user_id', session.user.id)
          .single();
        
        if (error) {
          // PGRST116 means zero rows returned (i.e. new user) which is normal
          if (error.code === 'PGRST116') {
            setAppState(null);
            setCloudLoaded(true);
          } else {
            console.error('Error fetching cloud state:', error);
            setSyncError(error.message || 'Erro ao comunicar com a base de dados.');
          }
        } else {
          if (data && data.app_state) {
            setAppState(data.app_state);
          } else {
            setAppState(null);
          }
          setCloudLoaded(true);
        }
      };
      fetchState();
    } else {
      setCloudLoaded(false);
      setAppState(null);
      setSyncError(null);
    }
  }, [session]);

  if (syncError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', color: '#0f172a', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '440px', textAlign: 'center', padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '28px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', margin: '8px 0 4px 0', color: '#0f172a', fontWeight: 600 }}>Falha de Sincronização</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Não conseguimos carregar seus dados salvos do Supabase. Verifique sua conexão à internet e recarregue a página para evitar a perda ou substituição indesejada de seus dados.
          </p>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px', width: '100%', marginBottom: '16px', wordBreak: 'break-all', textAlign: 'left', border: '1px solid #fee2e2' }}>
            {syncError}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '12px 24px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: '#6366f1', 
              color: '#ffffff', 
              fontSize: '14px', 
              fontWeight: 600, 
              cursor: 'pointer', 
              transition: 'background-color 0.2s, transform 0.1s',
              width: '100%',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
          >
            Recarregar Sistema
          </button>
        </div>
      </div>
    );
  }

  if (loading || (session && !cloudLoaded)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontWeight: 500 }}>Sincronizando com a nuvem...</span>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <StrictMode>
      {!session ? <Auth onLogin={setSession} /> : <App session={session} cloudState={appState} />}
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
