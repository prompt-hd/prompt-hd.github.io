// Copy text to clipboard and show a success message
export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(
    () => {
      // Create and show copy success popup
      const popup = document.createElement('div');
      popup.className = 'copy-popup';
      popup.textContent = '복사 완료!';
      document.body.appendChild(popup);
      
      // Remove popup after animation
      setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => {
          popup.remove();
        }, 500);
      }, 1500);
    },
    (err) => {
      console.error('Could not copy text: ', err);
      alert('복사 실패: ' + err);
    }
  );
};

// Calculate textarea rows based on content
export const calculateTextareaRows = (text) => {
  if (!text) return 4; // Minimum rows
  
  const lineBreaks = (text.match(/\n/g) || []).length;
  const textLength = text.length;
  const approxRows = Math.ceil(textLength / 80) + lineBreaks;
  
  return Math.min(Math.max(approxRows, 4), 20); // Between 4 and 20 rows
};

// Get shortened group name for tabs
export const getShortGroupName = (name) => {
  const mapping = {
    '표지': '표지',
    '기본 기능 실습': '기본',
    '고급 기능 실습': '고급'
  };
  
  return mapping[name] || name;
};

// Scroll to attachments section
export const scrollToAttachments = () => {
  const attachmentsElement = document.querySelector('.attachments');
  if (attachmentsElement) {
    attachmentsElement.scrollIntoView({ behavior: 'smooth' });
  }
};

// Import JSON data from file
export const importDataFromFile = (file, onSuccess, onError) => {
  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const parsedData = JSON.parse(event.target.result);
      if (parsedData.slides && Array.isArray(parsedData.slides)) {
        onSuccess(parsedData);
      } else {
        onError('유효하지 않은 데이터 형식입니다.');
      }
    } catch (error) {
      onError(`파일을 읽는 도중 오류가 발생했습니다: ${error.message}`);
    }
  };
  
  reader.onerror = () => {
    onError('파일을 읽는 도중 오류가 발생했습니다.');
  };
  
  reader.readAsText(file);
};

// Export data to JSON file
export const exportDataToJson = (data) => {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  
  // Format date for filename
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prompts-backup-${dateStr}.json`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};