import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', { email, username, password });
      // Auto-login after registration
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#16213e', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ color: '#eee', fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>AutoGrade TCG</h1>
        <p style={{ color: '#8899aa', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>Create your account</p>

        {error && (
          <div style={{ backgroundColor: 'rgba(233,69,96,0.15)', border: '1px solid #e94560', borderRadius: '8px', padding: '10px', marginBottom: '16px', color: '#e94560', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '4px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #0f3460', backgroundColor: '#1a1a2e', color: '#eee', fontSize: '15px', marginBottom: '14px', outline: 'none', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '4px' }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #0f3460', backgroundColor: '#1a1a2e', color: '#eee', fontSize: '15px', marginBottom: '14px', outline: 'none', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '4px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #0f3460', backgroundColor: '#1a1a2e', color: '#eee', fontSize: '15px', marginBottom: '20px', outline: 'none', boxSizing: 'border-box' }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e94560', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#8899aa', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#e94560', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
