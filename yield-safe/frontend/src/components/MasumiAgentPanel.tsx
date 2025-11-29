import { useState, useEffect, useCallback } from 'react';
import { masumiService, MasumiJobInput, RiskResult, JobSummary, AgentMetadata } from '../lib/masumiService';
import { enhancedAPI, EnhancedPoolData } from '../lib/enhancedAPI';
import toast from 'react-hot-toast';

interface JobWithResult {
  job_id: string;
  status: string;
  tokenPair: string;
  ilThreshold: number;
  created: string;
  result: RiskResult | null;
}

export function MasumiAgentPanel() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);
  const [jobs, setJobs] = useState<JobWithResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<RiskResult | null>(null);
  
  // Charli3 + AI Prediction state
  const [activeTab, setActiveTab] = useState<'masumi' | 'charli3'>('masumi');
  const [pools, setPools] = useState<EnhancedPoolData[]>([]);
  const [selectedPool, setSelectedPool] = useState<EnhancedPoolData | null>(null);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [loadingPools, setLoadingPools] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  
  // Form state
  const [tokenA, setTokenA] = useState('ADA');
  const [tokenB, setTokenB] = useState('SNEK');
  const [ilThreshold, setIlThreshold] = useState(5);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
    loadAgentMetadata();
    loadJobs();
    loadCharli3Pools();
  }, []);

  const loadCharli3Pools = async () => {
    setLoadingPools(true);
    try {
      const result = await enhancedAPI.getAllPools();
      setPools(result.pools || []);
    } catch (err) {
      console.error('Failed to load Charli3 pools:', err);
    } finally {
      setLoadingPools(false);
    }
  };

  const loadAIPrediction = async (tokenName: string) => {
    setLoadingPrediction(true);
    try {
      const prediction = await enhancedAPI.predictPrice(tokenName, [1, 24, 168]);
      setAiPrediction(prediction);
      toast.success('AI prediction loaded');
    } catch (err) {
      toast.error('Failed to load prediction');
    } finally {
      setLoadingPrediction(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const result = await masumiService.checkAvailability();
      setIsAvailable(result.status === 'available');
    } catch (err) {
      setIsAvailable(false);
      console.error('Failed to check availability:', err);
    }
  };

  const loadAgentMetadata = async () => {
    try {
      const data = await masumiService.getAgentMetadata();
      setMetadata(data);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await masumiService.getAllJobs();
      // Parse results for completed jobs
      const jobsWithResults: JobWithResult[] = data.jobs.map(job => ({
        ...job,
        result: job.result ? null : null // We'll fetch full results if needed
      }));
      setJobs(jobsWithResults);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActiveJob(null);
    setLatestResult(null);

    try {
      const input: MasumiJobInput = {
        tokenA,
        tokenB,
        ilThreshold
      };

      // Start job
      const jobResponse = await masumiService.startRiskAnalysis(input);
      setActiveJob(jobResponse.job_id);

      // Wait for result
      const result = await masumiService.waitForResult(jobResponse.job_id);
      setLatestResult(result);
      
      // Refresh job list
      await loadJobs();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setActiveJob(null);
    }
  }, [tokenA, tokenB, ilThreshold]);

  const formatAction = (action: 'STAY' | 'EMERGENCY_EXIT') => {
    return masumiService.formatAction(action);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Intelligence Hub</h2>
            <p className="text-sm text-gray-500">Masumi Agent + Charli3 Oracle + AI Predictions</p>
          </div>
        </div>
        
        {/* Availability Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {isAvailable === null ? 'Checking...' : isAvailable ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('masumi')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'masumi'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🤖 Masumi Risk Agent
        </button>
        <button
          onClick={() => setActiveTab('charli3')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'charli3'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📡 Charli3 + AI Predictions
        </button>
      </div>

      {activeTab === 'masumi' ? (
        <div>

      {/* Agent Info Card */}
      {metadata && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Agent ID</p>
              <p className="text-sm font-mono text-purple-700">{metadata.identifier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Version</p>
              <p className="text-sm font-semibold text-gray-700">{metadata.version}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Capabilities</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {metadata.capabilities.map((cap: string) => (
                  <span key={cap} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {cap.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pricing</p>
              <p className="text-sm text-gray-700">
                {metadata.pricing.amount} {metadata.pricing.currency} per {metadata.pricing.model.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Form */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">🎯 Run Risk Analysis</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token A</label>
            <select
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="ADA">ADA</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token B</label>
            <select
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="SNEK">SNEK</option>
              <option value="DJED">DJED</option>
              <option value="MIN">MIN</option>
              <option value="AGIX">AGIX</option>
              <option value="HOSKY">HOSKY</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IL Threshold (%)</label>
            <input
              type="number"
              value={ilThreshold}
              onChange={(e) => setIlThreshold(parseFloat(e.target.value))}
              min={0.1}
              max={50}
              step={0.1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !isAvailable}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            loading || !isAvailable
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing with GARCH + LSTM...
            </span>
          ) : (
            '🧠 Run AI Analysis'
          )}
        </button>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Latest Result */}
      {latestResult && (
        <div className={`border-2 rounded-lg p-4 mb-6 ${
          latestResult.action === 'EMERGENCY_EXIT'
            ? 'border-red-300 bg-red-50'
            : 'border-green-300 bg-green-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">📊 Analysis Result</h3>
            <span className={`text-lg ${formatAction(latestResult.action).color}`}>
              {formatAction(latestResult.action).icon} {formatAction(latestResult.action).text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">GARCH Volatility</p>
              <p className="text-lg font-semibold text-gray-800">{latestResult.garchVolatility}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">LSTM Volatility</p>
              <p className="text-lg font-semibold text-gray-800">{latestResult.lstmVolatility}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Confidence</p>
              <p className={`text-lg font-semibold ${masumiService.formatConfidence(latestResult.confidence).color}`}>
                {latestResult.confidence}% ({masumiService.formatConfidence(latestResult.confidence).text})
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Action</p>
              <p className={`text-lg font-semibold ${formatAction(latestResult.action).color}`}>
                {latestResult.action}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded border border-gray-200">
            <p className="text-sm text-gray-600">{latestResult.reason}</p>
            <p className="text-sm font-medium mt-2">{latestResult.recommendation}</p>
          </div>
        </div>
      )}

      {/* Job History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">📋 Job History</h3>
          <button
            onClick={loadJobs}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No jobs yet. Run an analysis to get started!</p>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.job_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    job.status === 'completed' ? 'bg-green-500' :
                    job.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                    job.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-800">{job.tokenPair}</p>
                    <p className="text-xs text-gray-500">
                      Threshold: {job.ilThreshold}% | {new Date(job.created).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {job.result && (
                    <span className={`text-sm font-medium ${
                      job.result === 'EMERGENCY_EXIT' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {job.result === 'EMERGENCY_EXIT' ? '🚨 Exit' : '✅ Safe'}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 font-mono">{job.job_id.slice(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MIP-003 Badge */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-400">Powered by</span>
        <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-semibold rounded">
          Masumi MIP-003
        </span>
        <span className="text-xs text-gray-400">Protocol</span>
      </div>
        </div>
      ) : (
        <div>
          {/* Charli3 + AI Tab Content */}
          <div className="space-y-6">
            {/* Pool Analytics */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                📡 Charli3 Oracle Data
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                  {pools.length} Pools Live
                </span>
              </h3>
              
              {loadingPools ? (
                <div className="text-center py-4">Loading pools...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {pools.slice(0, 10).map((pool) => (
                    <div
                      key={pool.poolId}
                      onClick={() => {
                        setSelectedPool(pool);
                        setAiPrediction(null);
                      }}
                      className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                        selectedPool?.poolId === pool.poolId
                          ? 'border-blue-500 bg-white'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{pool.name}</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            (pool.riskScore || 50) < 30 ? 'bg-green-500' :
                            (pool.riskScore || 50) < 50 ? 'bg-yellow-500' :
                            (pool.riskScore || 50) < 70 ? 'bg-orange-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600">
                            Risk: {pool.riskScore?.toFixed(0) || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <div className="text-gray-500">Price</div>
                          <div className="font-mono">${pool.currentPrice?.toFixed(6) || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">TVL</div>
                          <div className="font-mono">${pool.tvl?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">7d Vol</div>
                          <div className="font-mono">{pool.volatility7d ? `${(pool.volatility7d * 100).toFixed(2)}%` : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">24h Vol</div>
                          <div className="font-mono">${pool.volume24h?.toLocaleString() || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Prediction Section */}
            {selectedPool && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    🧠 AI Price Prediction for {selectedPool.name}
                  </h3>
                  <button
                    onClick={() => loadAIPrediction(selectedPool.name)}
                    disabled={loadingPrediction}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                  >
                    {loadingPrediction ? '⏳ Loading...' : '🔮 Predict'}
                  </button>
                </div>

                {aiPrediction ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {aiPrediction.predictions.map((pred: any) => (
                        <div key={pred.timeframe} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="text-xs text-gray-500 mb-1">{pred.timeframe}</div>
                          <div className="text-lg font-bold text-gray-900">${pred.predictedPrice.toFixed(6)}</div>
                          <div className={`text-sm font-medium ${pred.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pred.changePercent >= 0 ? '↗' : '↘'} {Math.abs(pred.changePercent).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: <span className="font-semibold">{pred.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {aiPrediction.analysis && (
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">📊 Technical Analysis</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Trend:</span>
                            <span className={`ml-2 font-semibold ${
                              aiPrediction.analysis.trend === 'bullish' ? 'text-green-600' :
                              aiPrediction.analysis.trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {aiPrediction.analysis.trend?.toUpperCase() || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Volatility:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {aiPrediction.analysis.volatility?.toFixed(2)}%
                            </span>
                          </div>
                          {aiPrediction.analysis.support && (
                            <div>
                              <span className="text-gray-500">Support:</span>
                              <span className="ml-2 font-mono text-green-600">
                                ${aiPrediction.analysis.support.toFixed(6)}
                              </span>
                            </div>
                          )}
                          {aiPrediction.analysis.resistance && (
                            <div>
                              <span className="text-gray-500">Resistance:</span>
                              <span className="ml-2 font-mono text-red-600">
                                ${aiPrediction.analysis.resistance.toFixed(6)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🔮</div>
                    <p>Click "Predict" to see AI-powered price forecasts</p>
                    <p className="text-xs mt-1">Uses GARCH + Statistical Models</p>
                  </div>
                )}
              </div>
            )}

            {!selectedPool && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>Select a pool above to view AI predictions</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MasumiAgentPanel;
