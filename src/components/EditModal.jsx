import { useEffect } from 'react';
import { calculateTextareaRows } from '../utils/helpers';

const EditModal = ({ 
  editingItemInfo, 
  editedItemText, 
  setEditedItemText, 
  editedItemGroup, 
  setEditedItemGroup, 
  editedItemUrl, 
  setEditedItemUrl, 
  editedItemPosition, 
  setEditedItemPosition, 
  promptData, 
  setPromptData, 
  currentSlide, 
  setCurrentSlide, 
  closeModal 
}) => {
  useEffect(() => {
    // Focus first input when modal opens, but not for slide add
    if (editingItemInfo && !(editingItemInfo.type === 'slide' && editingItemInfo.actionType === 'add')) {
      const firstInput = document.querySelector('.modal-content input, .modal-content textarea');
      if (firstInput) {
        firstInput.focus();
      }
    }
    
    // Handle escape key to close modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, editingItemInfo]);
  
  // Get existing group names
  const getExistingGroups = () => {
    const groups = new Set();
    promptData.slides.forEach(slide => {
      if (slide.group) {
        groups.add(slide.group);
      }
    });
    return Array.from(groups);
  };
  
  // Get modal title based on edit type
  const getModalTitle = () => {
    if (!editingItemInfo) return '';
    
    const { type, actionType } = editingItemInfo;
    
    if (type === 'prompt') {
      return actionType === 'add' ? '프롬프트 추가' : '프롬프트 편집';
    } else if (type === 'attachment') {
      return actionType === 'add' ? '첨부 파일 추가' : '첨부 파일 편집';
    } else if (type === 'slide') {
      return actionType === 'add' ? '슬라이드 추가' : '슬라이드 제목 편집';
    } else if (type === 'slidePosition') {
      return '슬라이드 위치 변경';
    }
    
    return '';
  };
  
  // Handle saving changes
  const handleSaveEdit = () => {
    if (!editingItemInfo) return;
    
    const { type, actionType, slideIndex, itemIndex } = editingItemInfo;
    
    // Validate inputs
    if ((type === 'prompt' || type === 'attachment' || type === 'slide') && 
        !editedItemText.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }
    
    if (type === 'attachment' && 
        editedItemUrl && 
        !editedItemUrl.match(/^https?:\/\/.+/)) {
      alert('유효한 URL을 입력해주세요. (http:// 또는 https:// 포함)');
      return;
    }
    
    if (type === 'slidePosition') {
      const newPosition = parseInt(editedItemPosition, 10);
      if (isNaN(newPosition) || 
          newPosition < 1 || 
          newPosition > promptData.slides.length) {
        alert(`위치는 1에서 ${promptData.slides.length} 사이의 숫자여야 합니다.`);
        return;
      }
    }
    
    const updatedSlides = [...promptData.slides];
    
    // Handle different edit types
    if (type === 'prompt') {
      if (actionType === 'add') {
        // Add new prompt
        if (!updatedSlides[slideIndex].prompts) {
          updatedSlides[slideIndex].prompts = [];
        }
        
        updatedSlides[slideIndex].prompts.push({
          text: editedItemText
        });
      } else {
        // Edit existing prompt
        updatedSlides[slideIndex].prompts[itemIndex].text = editedItemText;
      }
    } else if (type === 'attachment') {
      if (actionType === 'add') {
        // Add new attachment
        if (!updatedSlides[slideIndex].attachments) {
          updatedSlides[slideIndex].attachments = [];
        }
        
        if (editedItemUrl) {
          updatedSlides[slideIndex].attachments.push({
            type: 'url',
            text: editedItemText,
            url: editedItemUrl
          });
        } else {
          updatedSlides[slideIndex].attachments.push(editedItemText);
        }
      } else {
        // Edit existing attachment
        const attachment = updatedSlides[slideIndex].attachments[itemIndex];
        
        if (typeof attachment === 'object' && attachment.type === 'url') {
          updatedSlides[slideIndex].attachments[itemIndex] = {
            type: 'url',
            text: editedItemText,
            url: editedItemUrl
          };
        } else {
          if (editedItemUrl) {
            updatedSlides[slideIndex].attachments[itemIndex] = {
              type: 'url',
              text: editedItemText,
              url: editedItemUrl
            };
          } else {
            updatedSlides[slideIndex].attachments[itemIndex] = editedItemText;
          }
        }
      }
    } else if (type === 'slide') {
      if (actionType === 'add') {
        // Add new slide
        const newSlide = {
          group: editedItemGroup,
          title: editedItemText,
          prompts: [],
          attachments: [],
          tools: ['ChatGPT']  // ChatGPT를 기본으로 포함
        };
        
        updatedSlides.push(newSlide);
        
        // Set current slide to the new slide
        setTimeout(() => {
          setCurrentSlide(updatedSlides.length - 1);
        }, 100);
      } else {
        // Edit slide title
        updatedSlides[slideIndex].title = editedItemText;
      }
    } else if (type === 'slidePosition') {
      // Change slide position
      const newPosition = parseInt(editedItemPosition, 10);
      const targetIndex = newPosition - 1; // Convert to 0-based index
      
      if (targetIndex !== slideIndex) {
        // Remove slide from current position
        const [slideToMove] = updatedSlides.splice(slideIndex, 1);
        
        // Insert at new position
        updatedSlides.splice(targetIndex, 0, slideToMove);
        
        // If moving the current slide, update currentSlide
        if (currentSlide === slideIndex) {
          setTimeout(() => {
            setCurrentSlide(targetIndex);
          }, 100);
        } else if (
          // If current slide is in the affected range
          (currentSlide > slideIndex && currentSlide <= targetIndex) ||
          (currentSlide < slideIndex && currentSlide >= targetIndex)
        ) {
          // Adjust currentSlide
          const newCurrentSlide = currentSlide > slideIndex
            ? currentSlide - 1 // Moving earlier, shift current down
            : currentSlide + 1; // Moving later, shift current up
          
          setTimeout(() => {
            setCurrentSlide(newCurrentSlide);
          }, 100);
        }
      }
    }
    
    // Update the data
    setPromptData({
      ...promptData,
      slides: updatedSlides
    });
    
    // Close the modal
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{getModalTitle()}</h2>
        
        {editingItemInfo && (
          <div className="modal-form">
            {/* Form fields for Prompt */}
            {editingItemInfo.type === 'prompt' && (
              <div className="form-group">
                <label htmlFor="promptText">텍스트:</label>
                <textarea
                  id="promptText"
                  value={editedItemText}
                  onChange={(e) => setEditedItemText(e.target.value)}
                  rows={calculateTextareaRows(editedItemText)}
                />
              </div>
            )}
            
            {/* Form fields for Attachment */}
            {editingItemInfo.type === 'attachment' && (
              <>
                <div className="form-group">
                  <label htmlFor="attachmentText">텍스트:</label>
                  <textarea
                    id="attachmentText"
                    value={editedItemText}
                    onChange={(e) => setEditedItemText(e.target.value)}
                    rows={calculateTextareaRows(editedItemText)}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="attachmentUrl">URL (선택 사항):</label>
                  <input
                    type="url"
                    id="attachmentUrl"
                    value={editedItemUrl}
                    onChange={(e) => setEditedItemUrl(e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </>
            )}
            
            {/* Form fields for Slide (Add) */}
            {editingItemInfo.type === 'slide' && editingItemInfo.actionType === 'add' && (
              <>
                <div className="form-group">
                  <label htmlFor="slideGroup">그룹명:</label>
                  <select
                    id="slideGroup"
                    value={editedItemGroup}
                    onChange={(e) => setEditedItemGroup(e.target.value)}
                  >
                    <option value="">선택하세요</option>
                    {getExistingGroups().map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="slideTitle">제목:</label>
                  <textarea
                    id="slideTitle"
                    value={editedItemText}
                    onChange={(e) => setEditedItemText(e.target.value)}
                    rows={calculateTextareaRows(editedItemText)}
                  />
                </div>
              </>
            )}
            
            {/* Form fields for Slide (Edit Title) */}
            {editingItemInfo.type === 'slide' && editingItemInfo.actionType === 'edit' && (
              <div className="form-group">
                <label htmlFor="slideTitle">제목:</label>
                <textarea
                  id="slideTitle"
                  value={editedItemText}
                  onChange={(e) => setEditedItemText(e.target.value)}
                  rows={calculateTextareaRows(editedItemText)}
                />
              </div>
            )}
            
            {/* Form fields for Slide Position */}
            {editingItemInfo.type === 'slidePosition' && (
              <div className="form-group">
                <p className="position-context">
                  Current: {promptData.slides[editingItemInfo.slideIndex].title}
                </p>
                <label htmlFor="slidePosition">새 위치 (1 ~ {promptData.slides.length}):</label>
                <input
                  type="number"
                  id="slidePosition"
                  value={editedItemPosition}
                  onChange={(e) => setEditedItemPosition(e.target.value)}
                  min="1"
                  max={promptData.slides.length}
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="save-btn"
                onClick={handleSaveEdit}
              >
                저장
              </button>
              
              <button 
                className="cancel-btn"
                onClick={closeModal}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditModal;