import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Loader, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-indigo-50 to-purple-100 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl transform hover:rotate-12 transition-transform duration-300">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-lg text-slate-500 font-medium">Sign in to your Email Analyzer account</p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-white/50">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl animate-fade-in-up">
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="group">
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 transition-colors group-focus-within:text-blue-600">
                  Password
                </label>
                <Link to="#" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center group cursor-pointer">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-colors" />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600 font-medium cursor-pointer group-hover:text-slate-800 transition-colors">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Or</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Register Link */}
          <p className="text-center text-slate-600 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
