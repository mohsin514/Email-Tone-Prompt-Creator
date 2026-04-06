import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Loader, Eye, EyeOff, Check } from 'lucide-react';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = {
    hasLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumbers: /\d/.test(formData.password),
  };

  const passwordScore = Object.values(passwordStrength).filter(Boolean).length;
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordScore < 3) {
      setError('Password is not strong enough');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-lg text-gray-600 font-medium">Join us to analyze your email tones</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div className="relative mb-3">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="space-y-2 mb-4">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded ${
                          i < passwordScore
                            ? passwordScore <= 1
                              ? 'bg-red-500'
                              : passwordScore <= 2
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${passwordScore <= 1 ? 'text-red-600' : passwordScore <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {passwordScore <= 1 ? 'Weak' : passwordScore <= 2 ? 'Fair' : 'Strong'} Password
                  </p>
                </div>
              )}

              {/* Requirements */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  {passwordStrength.hasLength ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded" />
                  )}
                  <span className={passwordStrength.hasLength ? 'text-green-700' : 'text-gray-600'}>8+ characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasUpperCase ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded" />
                  )}
                  <span className={passwordStrength.hasUpperCase ? 'text-green-700' : 'text-gray-600'}>Uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasLowerCase ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded" />
                  )}
                  <span className={passwordStrength.hasLowerCase ? 'text-green-700' : 'text-gray-600'}>Lowercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.hasNumbers ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded" />
                  )}
                  <span className={passwordStrength.hasNumbers ? 'text-green-700' : 'text-gray-600'}>Number</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {formData.confirmPassword && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 flex items-center justify-center text-red-600 font-bold">✕</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" required className="w-4 h-4 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <label htmlFor="terms" className="text-xs text-gray-700 font-medium leading-relaxed">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !passwordsMatch || passwordScore < 3}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-8"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-700 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-bold transition">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600 font-medium">
          <p>Your data is secure and encrypted with 256-bit SSL</p>
        </div>
      </div>
    </div>
  );
}
