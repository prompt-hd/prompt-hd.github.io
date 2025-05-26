// Load initial data from localStorage or fall back to fetching from JSON file
export const loadInitialData = () => {
  try {
    const storedData = localStorage.getItem('promptAppData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.slides && Array.isArray(parsedData.slides)) {
        return parsedData;
      }
    }
    throw new Error('No valid data found in localStorage');
  } catch (error) {
    // If localStorage fails, clear it and fetch from file
    localStorage.removeItem('promptAppData');
    
    // Synchronous default for initial render
    return { slides: [] };
  }
};

// Save data to localStorage
export const saveToLocalStorage = (data) => {
  try {
    localStorage.setItem('promptAppData', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Helper function to fetch the initial JSON data
export const fetchInitialData = async () => {
  try {
    const response = await fetch('/prompts.json');
    if (!response.ok) {
      throw new Error('Failed to fetch prompts.json');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return { slides: [] };
  }
};