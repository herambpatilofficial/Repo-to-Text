
import React, { useState, useCallback } from 'react';
import { fetchRepoContents } from './services/githubService';
import { GithubIcon, DownloadIcon, LoaderIcon, ErrorIcon, CheckCircleIcon } from './components/Icons';

interface AnalysisResult {
  tree: string;
  combinedContent: string;
  fileName: string;
}

const App: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!repoUrl) {
      setError('Please enter a GitHub repository URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await fetchRepoContents(repoUrl, setLoadingMessage);
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [repoUrl]);

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.fileName}-bundle.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">GitHub Repo Bundler</h1>
          <p className="text-lg text-gray-400">Paste a public GitHub repo URL to get a single text file with its structure and code.</p>
        </header>

        <main>
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-grow w-full">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="e.g., https://github.com/facebook/react"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200 text-white placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isLoading ? <LoaderIcon className="animate-spin mr-2" /> : 'Analyze'}
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-8 text-center">
              <LoaderIcon className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-lg font-medium text-white">{loadingMessage}</p>
              <p className="text-gray-400">This may take a moment for large repositories...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg p-4">
              <ErrorIcon className="h-6 w-6 mr-3" />
              <div>
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-gray-800 rounded-lg shadow-xl animate-fade-in">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                  <h2 className="text-xl font-semibold text-white">Analysis Complete</h2>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  <DownloadIcon className="mr-2" />
                  Download .txt
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-300 mb-2">File Structure:</h3>
                <pre className="bg-gray-900 rounded-md p-4 max-h-64 overflow-y-auto text-sm text-gray-300">
                  <code>{result.tree}</code>
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
