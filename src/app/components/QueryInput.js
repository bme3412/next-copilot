export function QueryInput({ value, onChange, onSubmit, disabled }) {
    return (
      <form onSubmit={onSubmit} className="w-full">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder="Ask about NVIDIA's financial performance..."
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={disabled}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            Analyze
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          Try questions like: "How did NVIDIA perform in Q1 2023?", "What's their AI strategy?", 
          "Show revenue trends across quarters"
        </div>
      </form>
    );
  }