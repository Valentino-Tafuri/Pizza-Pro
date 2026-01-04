
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { LogIn, UserPlus, Mail, Lock, Pizza } from 'lucide-react';

const AuthView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setError("Inserisci l'email per il ripristino");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email di ripristino inviata!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-8 pt-24 animate-in fade-in duration-700">
      <div className="flex flex-col items-center mb-12">
        <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center shadow-2xl mb-6">
          <Pizza className="text-white" size={40} />
        </div>
        <h1 className="text-4xl font-black text-black tracking-tight text-center">
          {isLogin ? 'Bentornato' : 'Crea Account'}
        </h1>
        <p className="text-gray-400 mt-2 text-center font-medium">
          {isLogin ? 'Gestisci il food cost della tua pizzeria' : 'Inizia a ottimizzare i tuoi margini'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-bounce">
            {error}
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-black/5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-black/5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-black/10 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
              <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 space-y-4 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-bold text-black"
        >
          {isLogin ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
        {isLogin && (
          <button
            onClick={resetPassword}
            className="block w-full text-xs font-bold text-gray-400"
          >
            Password dimenticata?
          </button>
        )}
      </div>

      <p className="mt-auto mb-8 text-[10px] text-gray-300 text-center uppercase tracking-widest font-black">
        PizzaCost v2.0 • Progettato per iOS
      </p>
    </div>
  );
};

export default AuthView;
