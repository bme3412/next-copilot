export function QueryInput({ value, onChange, onSubmit, disabled }) {
    return (
      <form onSubmit={onSubmit} className="w-full">
        <div className="flex gap-3">
          <input
            type="text"
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder="Ask about NVIDIA's financial performance..."
            className="flex-1 p-4 bg-gray-900/50 text-white placeholder-gray-400 border border-gray-700 rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
              disabled:opacity-50 transition-all backdrop-blur-sm"
          />
          <button
            type="submit"
            disabled={disabled}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl 
              hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 ease-in-out font-medium shadow-lg shadow-blue-500/20
              hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {disabled ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin mr-2" />
                Processing...
              </div>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-400 px-2">
          <span className="font-medium text-blue-400">Try asking:</span> "How did NVIDIA perform in Q1 2023?",
          "What's their AI strategy?", "Show revenue trends across quarters"
        </div>
      </form>
    );
  }