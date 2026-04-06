import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LinkGmailButton } from '../components/LinkGmailButton';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Mail, Zap, TrendingUp, CheckCircle, Download, Bell, Settings, User, LogOut, Filter } from 'lucide-react';
import { useSocketIO, useJobUpdates } from '../hooks/useRealTime';

interface RealEmail {
  id: string;
  subject: string;
  from: string;
  tone: string;
  sentiment: string;
  confidenceScore: number;
  sentAt: string;
  analyzedAt: string;
}

export function UserDashboard() {
  const { user, logout, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'emails' | 'patterns' | 'analytics' | 'jobs' | 'settings'>('overview');
  const [isGmailLinked, setIsGmailLinked] = useState(false);
  const [realEmails, setRealEmails] = useState<RealEmail[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [userJobs, setUserJobs] = useState<any[]>([]);

  // Initialize Socket.IO connection
  const { isConnected } = useSocketIO();
  const { latestUpdate } = useJobUpdates(user?.id || null);

  // Listen for completed jobs to refresh emails and analytics
  useEffect(() => {
    if (latestUpdate) {
      if (latestUpdate.status === 'completed' || latestUpdate.status === 'processing') {
        if (user?.id && accessToken) {
          fetchUserJobs();
          if (latestUpdate.status === 'completed') {
            fetchRealEmails();
          }
        }
      }
    }
  }, [latestUpdate]);

  const fetchUserJobs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${user?.id}/jobs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserJobs(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  // Mock data (fallback for demo)
  const mockStats = [
    { label: 'Total Emails', value: '0', icon: Mail, gradient: 'from-blue-500 to-blue-600', trend: '—' },
    { label: 'Analysis Score', value: '—', icon: Zap, gradient: 'from-amber-500 to-amber-600', trend: '—' },
    { label: 'Tone Patterns', value: '0', icon: TrendingUp, gradient: 'from-purple-500 to-purple-600', trend: '—' },
    { label: 'Recommendations', value: '0', icon: CheckCircle, gradient: 'from-green-500 to-green-600', trend: '—' },
  ];

  // Check if Gmail is linked and fetch real emails
  useEffect(() => {
    if (user?.id && accessToken) {
      checkGmailStatus();
      fetchUserJobs();
    }
  }, [user?.id, accessToken]);

  const checkGmailStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${user?.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setIsGmailLinked(!!userData.gmailLinked);

        // If Gmail is linked, fetch emails
        if (userData.gmailLinked) {
          fetchRealEmails();
        }
      }
    } catch (error) {
      console.error('Failed to check Gmail status:', error);
    }
  };

  const fetchRealEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${user?.id}/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const emails = await response.json();
        setRealEmails(emails.data || []);

        // Fetch analytics
        const analyticsResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/${user?.id}/analytics`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (analyticsResponse.ok) {
          const analytics = await analyticsResponse.json();
          setAnalyticsData(analytics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleGmailLinked = () => {
    // Refresh Gmail status and emails from backend
    checkGmailStatus();
    fetchUserJobs();
  };

  // Use real data if available, otherwise use mock
  const stats = analyticsData
    ? [
        { label: 'Total Emails', value: analyticsData.totalEmails, icon: Mail, gradient: 'from-blue-500 to-blue-600', trend: `+${analyticsData.newEmails || 0}` },
        { label: 'Analyzed Emails', value: analyticsData.analyzedEmails, icon: Zap, gradient: 'from-amber-500 to-amber-600', trend: `${Math.round((analyticsData.analyzedEmails / Math.max(analyticsData.totalEmails, 1)) * 100)}%` },
        { label: 'Avg Score', value: `${Math.round(analyticsData.averageScore)}%`, icon: TrendingUp, gradient: 'from-purple-500 to-purple-600', trend: 'Quality' },
        { label: 'Patterns Found', value: Object.keys(analyticsData.toneDistribution || {}).length, icon: CheckCircle, gradient: 'from-green-500 to-green-600', trend: 'Types' },
      ]
    : mockStats;



  const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#10b981'];

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'Professional': return 'text-blue-600';
      case 'Friendly': return 'text-green-600';
      case 'Formal': return 'text-purple-600';
      case 'Casual': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Tone Prompt Creator</h1>
              <p className="text-sm text-gray-600">
                Welcome back, <span className="font-semibold">{user?.name}</span>
                {isGmailLinked && <span className="ml-2 text-green-600">✓ Gmail Linked</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mr-2 border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            )}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition relative group">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <User className="w-6 h-6 text-gray-600" />
            </button>
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-lg transition">
              <LogOut className="w-6 h-6 text-red-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Gmail Account Management - Always Show */}
        <div className="mb-12">
          <LinkGmailButton userId={user?.id!} isLinked={isGmailLinked} onLinked={handleGmailLinked} accessToken={accessToken!} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">{stat.trend}</span>
                </div>
              </div>
            );
          })}
        </div>

        {!isGmailLinked ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-gray-100 text-center">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Email Data Yet</h3>
            <p className="text-gray-600 mb-6">Link your Gmail account above to start analyzing your emails automatically.</p>
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Click "Link Gmail Account"</h4>
                  <p className="text-sm text-gray-600">Authorize us to read your emails</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900">We fetch your emails</h4>
                  <p className="text-sm text-gray-600">From your Gmail account</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900">AI analyzes tone</h4>
                  <p className="text-sm text-gray-600">Real-time sentiment and tone analysis</p>
                </div>
              </div>
            </div>
          </div>
        ) : isLoadingEmails ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-gray-100 text-center">
            <div className="inline-block animate-spin mb-4">
              <Mail className="w-16 h-16 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Fetching Your Emails</h3>
            <p className="text-gray-600">This may take a moment...</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 w-fit border border-gray-200 shadow-sm">
              {(['overview', 'emails', 'patterns', 'jobs', 'analytics', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-md font-semibold text-sm transition ${
                    activeTab === tab ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="space-y-8">
              {activeTab === 'overview' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Emails</h3>
                  <div className="space-y-4">
                    {realEmails.length > 0 ? (
                      realEmails.slice(0, 5).map((email) => (
                        <div key={email.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-gray-900 font-semibold">{email.from || 'Sent'}</p>
                              <p className="text-gray-600 text-sm mt-1">{email.subject}</p>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                              <span className={`text-sm font-semibold capitalize ${getToneColor(email.tone)}`}>{email.tone || 'Pending'}</span>
                              <div className="text-right">
                                <p className="text-gray-900 font-bold">{email.confidenceScore ? `${email.confidenceScore}%` : '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No emails found yet.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'emails' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900">All Stored Emails ({realEmails.length})</h3>
                    <div className="flex gap-3">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <Filter className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {realEmails.map((email) => (
                      <div key={email.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 transition flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 font-semibold">{email.subject}</p>
                          <p className="text-gray-600 text-xs mt-1">{new Date(email.sentAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className={`text-sm font-semibold capitalize ${getToneColor(email.tone)}`}>{email.tone || 'Pending'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'patterns' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Your Communication DNA</h3>
                      <p className="text-sm text-gray-600">Multi-context tone patterns extracted from your real interactions.</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  
                  {analyticsData?.prompts?.byContext ? (
                    <div className="grid grid-cols-1 gap-8">
                      {Object.entries(analyticsData.prompts.byContext).map(([context, prompts]: [string, any]) => {
                        const latestPrompt = prompts[0];
                        return (
                          <div key={context} className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-purple-600" />
                            
                            <div className="p-6 md:p-8">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <TrendingUp className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="text-2xl font-bold text-gray-900 capitalize">{context} Context</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                                        Version {latestPrompt?.version || 1}
                                      </span>
                                      <span className="text-gray-300 text-xs">•</span>
                                      <span className="text-xs text-gray-500">Updated {new Date(latestPrompt?.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Consistency</p>
                                    <p className="text-2xl font-bold text-blue-600">{(latestPrompt?.consistency * 100).toFixed(0)}%</p>
                                  </div>
                                  <div className="w-px h-10 bg-gray-200" />
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Quality</p>
                                    <p className="text-2xl font-bold text-purple-600">{latestPrompt?.qualityScore?.toFixed(0)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Style Breakdown */}
                                <div className="space-y-6">
                                  <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    Tone Traits Breakdown
                                  </h5>
                                  <div className="space-y-4">
                                    {latestPrompt?.styleTraits && Object.entries(latestPrompt.styleTraits).map(([trait, value]: [string, any], idx) => (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex justify-between text-xs font-semibold capitalize">
                                          <span className="text-gray-700">{trait}</span>
                                          <span className="text-blue-600">{(value * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000" 
                                            style={{ width: `${value * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Prompt Review */}
                                <div className="space-y-4">
                                  <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                                    <Download className="w-4 h-4 text-blue-500" />
                                    Active System Prompt
                                  </h5>
                                  <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 relative group/prompt">
                                    <p className="text-blue-100 font-mono text-sm leading-relaxed max-h-[220px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-800">
                                      {latestPrompt?.toneText}
                                    </p>
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(latestPrompt?.toneText)}
                                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all flex items-center gap-2 text-xs font-semibold"
                                    >
                                      Copy DNA
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <TrendingUp className="w-10 h-10 text-gray-300" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">Analyzing your patterns...</h4>
                      <p className="text-gray-500 max-w-sm mx-auto">
                        Once human-level context classification is complete, we'll generate your unique writing DNA profiles here.
                      </p>
                      <button 
                        onClick={() => setActiveTab('jobs')}
                        className="mt-6 text-blue-600 font-bold hover:underline"
                      >
                        Check Job Progress →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Background Processing Logs</h3>
                      <p className="text-sm text-gray-600">Track real-time status of AI classification and tone analysis.</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-sm font-semibold flex items-center gap-2">
                       <Zap className="w-4 h-4 animate-pulse" /> {userJobs.filter(j => j.status === 'processing').length} Active
                    </div>
                  </div>

                  <div className="space-y-6">
                    {userJobs.length > 0 ? (
                      userJobs.map((job) => (
                        <div key={job.id} className="p-6 bg-gray-50 border border-gray-200 rounded-xl relative overflow-hidden group">
                          {job.status === 'processing' && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
                              <div className="h-full bg-blue-500 animate-infinite-slide" style={{ width: '40%' }} />
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                job.status === 'completed' ? 'bg-green-100 text-green-600' :
                                job.status === 'failed' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                <Zap className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 capitalize leading-none mb-1">
                                  {job.type.replace('_', ' ')}
                                  {job.context && <span className="ml-2 font-normal text-gray-500">• {job.context}</span>}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  Started: {new Date(job.startedAt || job.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                job.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                job.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              }`}>
                                {job.status}
                              </span>
                              {job.status === 'failed' && (
                                <p className="text-xs text-red-600 mt-2 font-medium">{job.errorMessage}</p>
                              )}
                              {job.status === 'completed' && (
                                <p className="text-xs text-gray-400 mt-2">Finished in {Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-12">No recent jobs found.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Email Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Tone Distribution</h4>
                      {analyticsData?.toneDistribution && Object.keys(analyticsData.toneDistribution).length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={Object.entries(analyticsData.toneDistribution).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                              {Object.entries(analyticsData.toneDistribution).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                         <div className="h-[300px] flex items-center justify-center text-gray-400 font-medium bg-gray-50 rounded-xl">Waiting for more data...</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Quick Stats</h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-gray-600 text-sm">Total Emails</p>
                          <p className="text-3xl font-bold text-blue-600 mt-2">{analyticsData?.totalEmails || 0}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-gray-600 text-sm">Average Score</p>
                          <p className="text-3xl font-bold text-green-600 mt-2">{Math.round(analyticsData?.averageScore || 0)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
                  <LinkGmailButton userId={user?.id!} isLinked={isGmailLinked} onLinked={handleGmailLinked} accessToken={accessToken!} />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
