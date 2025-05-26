import { useState } from 'react';
import { Wrench, ExternalLink, Edit, Trash2, ChevronDown } from 'lucide-react';
import { copyToClipboard, calculateTextareaRows, scrollToAttachments } from '../utils/helpers';

const SlideContent = ({ 
  promptData, 
  setPromptData, 
  currentSlide, 
  isEditMode, 
  showAllSlides, 
  isAttachmentVisible,
  openItemEditModal,
  toolLinks,
  startTutorial
}) => {
  // Editing state for inline editing
  const [editingPrompts, setEditingPrompts] = useState({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editingAttachments, setEditingAttachments] = useState({});
  const [editedAttachmentText, setEditedAttachmentText] = useState('');
  const [isEditingTools, setIsEditingTools] = useState(false);
  const [selectedTools, setSelectedTools] = useState([]);
  const [confirmingDelete, setConfirmingDelete] = useState({});
  
  if (!promptData.slides || promptData.slides.length === 0) {
    return <div className="loading">Loading slides...</div>;
  }
  
  const currentSlideData = promptData.slides[currentSlide];
  
  // Render the tools section
  const renderToolsSection = (slide, slideIndex) => {
    const availableTools = Object.keys(toolLinks);
    const slideTools = slide.tools || [];
    
    return (
      <div className="tools-section">
        <div className="tools-header">
          <Wrench size={16} />
          <span>사용 도구</span>
          
          {isEditMode && isEditingTools !== slideIndex && (
            <button 
              className="edit-tools-btn"
              onClick={() => {
                setIsEditingTools(slideIndex);
                // Include ChatGPT by default if not already present
                const defaultTools = slideTools.includes('ChatGPT') ? [...slideTools] : [...slideTools, 'ChatGPT'];
                setSelectedTools(defaultTools);
              }}
            >
              <Edit size={14} />
              <span>Edit</span>
            </button>
          )}
        </div>
        
        {isEditingTools === slideIndex ? (
          <div className="tools-edit">
            <div className="tools-checkboxes">
              {availableTools.map((tool) => (
                <label key={tool} className="tool-checkbox">
                  <input 
                    type="checkbox"
                    checked={selectedTools.includes(tool)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTools([...selectedTools, tool]);
                      } else {
                        setSelectedTools(selectedTools.filter(t => t !== tool));
                      }
                    }}
                  />
                  <span>{tool}</span>
                </label>
              ))}
            </div>
            
            <div className="tools-edit-actions">
              <button 
                className="save-tools-btn"
                onClick={() => {
                  const updatedSlides = [...promptData.slides];
                  updatedSlides[slideIndex] = {
                    ...updatedSlides[slideIndex],
                    tools: [...selectedTools]
                  };
                  setPromptData({
                    ...promptData,
                    slides: updatedSlides
                  });
                  setIsEditingTools(false);
                }}
              >
                Save
              </button>
              
              <button 
                className="cancel-tools-btn"
                onClick={() => setIsEditingTools(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="tools-list">
            {slideTools.length > 0 ? (
              slideTools.map((tool) => (
                <a 
                  key={tool}
                  href={toolLinks[tool]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tool-tag"
                >
                  {tool}
                  <ExternalLink size={12} />
                </a>
              ))
            ) : (
              isEditMode && (
                <button 
                  className="add-tools-btn"
                  onClick={() => {
                    setIsEditingTools(slideIndex);
                    setSelectedTools(['ChatGPT']);
                  }}
                >
                  Add Tools
                </button>
              )
            )}
          </div>
        )}
      </div>
    );
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = (type, slideIndex, itemIndex = null) => {
    const key = itemIndex !== null ? `${slideIndex}-${itemIndex}` : `slide-${slideIndex}`;
    setConfirmingDelete({
      ...confirmingDelete,
      [key]: true
    });
  };
  
  // Handle slide deletion
  const handleDeleteSlide = (slideIndexToDelete) => {
    if (slideIndexToDelete === 0) {
      alert('Cover slide cannot be deleted.');
      return;
    }
    
    const updatedSlides = promptData.slides.filter((_, index) => index !== slideIndexToDelete);
    
    // Adjust currentSlide if necessary
    let newCurrentSlide = currentSlide;
    if (currentSlide === slideIndexToDelete) {
      newCurrentSlide = Math.min(currentSlide, updatedSlides.length - 1);
    } else if (currentSlide > slideIndexToDelete) {
      newCurrentSlide = currentSlide - 1;
    }
    
    setPromptData({
      ...promptData,
      slides: updatedSlides
    });
    
    // Clear confirmation
    const key = `slide-${slideIndexToDelete}`;
    const updatedConfirming = { ...confirmingDelete };
    delete updatedConfirming[key];
    setConfirmingDelete(updatedConfirming);
  };
  
  // Handle prompt deletion
  const handleDeletePrompt = (slideIndex, promptIndex) => {
    const updatedSlides = [...promptData.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      prompts: updatedSlides[slideIndex].prompts.filter((_, index) => index !== promptIndex)
    };
    
    setPromptData({
      ...promptData,
      slides: updatedSlides
    });
    
    // Clear confirmation
    const key = `${slideIndex}-${promptIndex}`;
    const updatedConfirming = { ...confirmingDelete };
    delete updatedConfirming[key];
    setConfirmingDelete(updatedConfirming);
  };
  
  // Handle attachment deletion
  const handleDeleteAttachment = (slideIndex, attachmentIndex) => {
    const updatedSlides = [...promptData.slides];
    updatedSlides[slideIndex] = {
      ...updatedSlides[slideIndex],
      attachments: updatedSlides[slideIndex].attachments.filter((_, index) => index !== attachmentIndex)
    };
    
    setPromptData({
      ...promptData,
      slides: updatedSlides
    });
    
    // Clear confirmation
    const key = `attachment-${slideIndex}-${attachmentIndex}`;
    const updatedConfirming = { ...confirmingDelete };
    delete updatedConfirming[key];
    setConfirmingDelete(updatedConfirming);
  };
  
  // Handle adding a new prompt
  const handleAddPrompt = (slideIndex) => {
    if (isEditMode) {
      // In edit mode, add prompt directly without modal
      const updatedSlides = [...promptData.slides];
      if (!updatedSlides[slideIndex].prompts) {
        updatedSlides[slideIndex].prompts = [];
      }
      
      updatedSlides[slideIndex].prompts.push({
        text: ''
      });
      
      setPromptData({
        ...promptData,
        slides: updatedSlides
      });
      
      // Set the new prompt to editing mode
      const newPromptIndex = updatedSlides[slideIndex].prompts.length - 1;
      setEditingPrompts({
        ...editingPrompts,
        [`${slideIndex}-${newPromptIndex}`]: true
      });
    } else {
      // In normal mode, use modal
      openItemEditModal({
        type: 'prompt',
        actionType: 'add',
        slideIndex
      });
    }
  };
  
  // Handle adding a new attachment
  const handleAddAttachment = (slideIndex) => {
    openItemEditModal({
      type: 'attachment',
      actionType: 'add',
      slideIndex
    });
  };
  
  // Handle editing slide title
  const handleEditSlideTitle = (slideIndex) => {
    openItemEditModal({
      type: 'slide',
      actionType: 'edit',
      slideIndex
    });
  };
  
  // Handle changing slide position
  const handleSetSlidePositionClick = (slideIndex) => {
    openItemEditModal({
      type: 'slidePosition',
      actionType: 'edit',
      slideIndex
    });
  };

  // Cover page view
  if (currentSlide === 0 && !showAllSlides) {
    return (
      <div className="cover-page">
        <h1 className="cover-title">{currentSlideData.title}</h1>
        <p className="cover-content">{currentSlideData.content}</p>
        <button 
          className="start-tutorial-btn"
          onClick={startTutorial}
        >
          시작하기
        </button>
      </div>
    );
  }
  
  // All slides view (edit mode)
  if (isEditMode && showAllSlides) {
    return (
      <div className="all-slides-view">
        {promptData.slides.filter((_, index) => index > 0).map((slide, i) => {
          const slideIndex = i + 1; // Adjusted for filtering out cover slide
          
          return (
            <div key={slideIndex} className="slide-edit-container">
              <div className="slide-edit-header">
                <h3>
                  <span className="slide-number">{slideIndex}</span>
                  <span className="slide-title">{slide.title}</span>
                </h3>
                
                <div className="slide-actions">
                  <button 
                    className="edit-title-btn"
                    onClick={() => handleEditSlideTitle(slideIndex)}
                  >
                    <Edit size={16} />
                    <span>Edit Title</span>
                  </button>
                  
                  <button 
                    className="set-position-btn"
                    onClick={() => handleSetSlidePositionClick(slideIndex)}
                  >
                    <span>Set Position</span>
                  </button>
                  
                  {confirmingDelete[`slide-${slideIndex}`] ? (
                    <div className="delete-confirm">
                      <span>정말 삭제하시겠습니까?</span>
                      <button onClick={() => handleDeleteSlide(slideIndex)}>Yes</button>
                      <button onClick={() => {
                        const updatedConfirming = { ...confirmingDelete };
                        delete updatedConfirming[`slide-${slideIndex}`];
                        setConfirmingDelete(updatedConfirming);
                      }}>No</button>
                    </div>
                  ) : (
                    <button 
                      className="delete-slide-btn"
                      onClick={() => handleConfirmDelete('slide', slideIndex)}
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
              
              {renderToolsSection(slide, slideIndex)}
              
              <div className="prompts-section edit-mode">
                <h4>프롬프트</h4>
                
                {slide.prompts && slide.prompts.map((prompt, promptIndex) => (
                  <div key={promptIndex} className="prompt-card edit-mode">
                    <div className="prompt-header">
                      <span className="prompt-number">{promptIndex + 1}</span>
                      
                      {confirmingDelete[`${slideIndex}-${promptIndex}`] ? (
                        <div className="delete-confirm">
                          <span>정말 삭제하시겠습니까?</span>
                          <button onClick={() => handleDeletePrompt(slideIndex, promptIndex)}>Yes</button>
                          <button onClick={() => {
                            const updatedConfirming = { ...confirmingDelete };
                            delete updatedConfirming[`${slideIndex}-${promptIndex}`];
                            setConfirmingDelete(updatedConfirming);
                          }}>No</button>
                        </div>
                      ) : (
                        <button 
                          className="delete-prompt-btn"
                          onClick={() => handleConfirmDelete('prompt', slideIndex, promptIndex)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="prompt-content">
                      <textarea
                        value={prompt.text}
                        rows={calculateTextareaRows(prompt.text)}
                        onChange={(e) => {
                          const updatedSlides = [...promptData.slides];
                          updatedSlides[slideIndex].prompts[promptIndex] = {
                            ...prompt,
                            text: e.target.value
                          };
                          setPromptData({
                            ...promptData,
                            slides: updatedSlides
                          });
                        }}
                        className="prompt-textarea always-editable"
                        placeholder="프롬프트를 입력하세요"
                      />
                    </div>
                  </div>
                ))}
                
                <button 
                  className="add-prompt-btn"
                  onClick={() => handleAddPrompt(slideIndex)}
                >
                  + 프롬프트 추가
                </button>
              </div>
              
              <div className={`attachments ${isEditMode ? 'edit-mode' : ''}`}>
                <h4>첨부 파일:</h4>
                
                {isEditMode && (
                  <button 
                    className="add-attachment-btn"
                    onClick={() => handleAddAttachment(slideIndex)}
                  >
                    + 첨부 파일 추가
                  </button>
                )}
                
                {slide.attachments && slide.attachments.map((attachment, attachmentIndex) => {
                  const isUrl = typeof attachment === 'object' && attachment.type === 'url';
                  const text = isUrl ? attachment.text : (typeof attachment === 'object' && attachment.text !== undefined ? attachment.text : attachment);
                  const url = isUrl ? attachment.url : '';
                  
                  return (
                    <div key={attachmentIndex} className="attachment-item edit-mode">
                      {editingAttachments[`${slideIndex}-${attachmentIndex}`] ? (
                        <div className="attachment-edit">
                          <textarea
                            value={editedAttachmentText}
                            rows={calculateTextareaRows(editedAttachmentText)}
                            onChange={(e) => setEditedAttachmentText(e.target.value)}
                            onBlur={() => {
                              const updatedSlides = [...promptData.slides];
                              if (isUrl) {
                                updatedSlides[slideIndex].attachments[attachmentIndex] = {
                                  ...updatedSlides[slideIndex].attachments[attachmentIndex],
                                  text: editedAttachmentText
                                };
                              } else {
                                updatedSlides[slideIndex].attachments[attachmentIndex] = editedAttachmentText;
                              }
                              
                              setPromptData({
                                ...promptData,
                                slides: updatedSlides
                              });
                              
                              const updatedEditing = { ...editingAttachments };
                              delete updatedEditing[`${slideIndex}-${attachmentIndex}`];
                              setEditingAttachments(updatedEditing);
                            }}
                            autoFocus
                          />
                          
                          {isUrl && (
                            <input 
                              type="url"
                              value={url}
                              onChange={(e) => {
                                const updatedSlides = [...promptData.slides];
                                updatedSlides[slideIndex].attachments[attachmentIndex] = {
                                  ...updatedSlides[slideIndex].attachments[attachmentIndex],
                                  url: e.target.value
                                };
                                setPromptData({
                                  ...promptData,
                                  slides: updatedSlides
                                });
                              }}
                              placeholder="URL"
                              className="attachment-url-input"
                            />
                          )}
                        </div>
                      ) : (
                        <div 
                          className="attachment-content"
                          onClick={() => {
                            setEditingAttachments({
                              ...editingAttachments,
                              [`${slideIndex}-${attachmentIndex}`]: true
                            });
                            setEditedAttachmentText(text);
                          }}
                        >
                          {isUrl ? (
                            <>
                              <span className="attachment-text">{text}</span>
                              <a 
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="attachment-url"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={14} />
                              </a>
                            </>
                          ) : (
                            <span className="attachment-text">{text}</span>
                          )}
                        </div>
                      )}
                      
                      {confirmingDelete[`attachment-${slideIndex}-${attachmentIndex}`] ? (
                        <div className="delete-confirm">
                          <span>정말 삭제하시겠습니까?</span>
                          <button onClick={() => handleDeleteAttachment(slideIndex, attachmentIndex)}>Yes</button>
                          <button onClick={() => {
                            const updatedConfirming = { ...confirmingDelete };
                            delete updatedConfirming[`attachment-${slideIndex}-${attachmentIndex}`];
                            setConfirmingDelete(updatedConfirming);
                          }}>No</button>
                        </div>
                      ) : (
                        <button 
                          className="delete-attachment-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDelete('attachment', slideIndex, attachmentIndex);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        <button 
          className="add-slide-btn"
          onClick={() => openItemEditModal({
            type: 'slide',
            actionType: 'add'
          })}
        >
          + 슬라이드 추가
        </button>
      </div>
    );
  }
  
  // Single slide view
  return (
    <div className="slide-content">
      <div className="slide-title-main">
        {currentSlide > 0 && <span className="slide-number">{currentSlide}</span>}
        
        {isEditMode ? (
          <input 
            type="text"
            value={currentSlideData.title}
            onChange={(e) => {
              const updatedSlides = [...promptData.slides];
              updatedSlides[currentSlide] = {
                ...updatedSlides[currentSlide],
                title: e.target.value
              };
              setPromptData({
                ...promptData,
                slides: updatedSlides
              });
            }}
            className="title-edit-input always-editable"
            placeholder="슬라이드 제목을 입력하세요"
          />
        ) : (
          <h2 className="slide-title">
            {currentSlideData.title}
          </h2>
        )}
        
        {isEditMode && (
          <div className="slide-actions">
            <button 
              className="set-position-btn"
              onClick={() => handleSetSlidePositionClick(currentSlide)}
            >
              <span>Set Position</span>
            </button>
            
            {confirmingDelete[`slide-${currentSlide}`] ? (
              <div className="delete-confirm">
                <span>정말 삭제하시겠습니까?</span>
                <button onClick={() => handleDeleteSlide(currentSlide)}>Yes</button>
                <button onClick={() => {
                  const updatedConfirming = { ...confirmingDelete };
                  delete updatedConfirming[`slide-${currentSlide}`];
                  setConfirmingDelete(updatedConfirming);
                }}>No</button>
              </div>
            ) : (
              <button 
                className="delete-slide-btn"
                onClick={() => handleConfirmDelete('slide', currentSlide)}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {renderToolsSection(currentSlideData, currentSlide)}
      
      <div className={`prompts-section ${isEditMode ? 'edit-mode' : ''}`}>
        {currentSlideData.prompts && currentSlideData.prompts.map((prompt, promptIndex) => (
          <div key={promptIndex} className="prompt-card">
            <div className="prompt-main-content">
              <div className="prompt-header">
                <span className="prompt-number">{promptIndex + 1}</span>
                
                {isEditMode && (
                  confirmingDelete[`${currentSlide}-${promptIndex}`] ? (
                    <div className="delete-confirm">
                      <span>정말 삭제하시겠습니까?</span>
                      <button onClick={() => handleDeletePrompt(currentSlide, promptIndex)}>Yes</button>
                      <button onClick={() => {
                        const updatedConfirming = { ...confirmingDelete };
                        delete updatedConfirming[`${currentSlide}-${promptIndex}`];
                        setConfirmingDelete(updatedConfirming);
                      }}>No</button>
                    </div>
                  ) : (
                    <button 
                      className="delete-prompt-btn"
                      onClick={() => handleConfirmDelete('prompt', currentSlide, promptIndex)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                )}
              </div>
              
              <div className="prompt-content">
                {isEditMode ? (
                  <textarea
                    value={prompt.text}
                    rows={calculateTextareaRows(prompt.text)}
                    onChange={(e) => {
                      const updatedSlides = [...promptData.slides];
                      updatedSlides[currentSlide].prompts[promptIndex] = {
                        ...prompt,
                        text: e.target.value
                      };
                      setPromptData({
                        ...promptData,
                        slides: updatedSlides
                      });
                    }}
                    className="prompt-textarea always-editable"
                    placeholder="프롬프트를 입력하세요"
                  />
                ) : (
                  <div className="prompt-text">
                    {prompt.text}
                  </div>
                )}
              </div>
            </div>
            
            {!isEditMode && (
              <div className="prompt-copy-section">
                <button 
                  className="copy-btn-large"
                  onClick={() => copyToClipboard(prompt.text)}
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        ))}
        
        {isEditMode && (
          <button 
            className="add-prompt-btn"
            onClick={() => handleAddPrompt(currentSlide)}
          >
            + 프롬프트 추가
          </button>
        )}
      </div>
      
      {((currentSlideData.attachments && currentSlideData.attachments.length > 0) || isEditMode) && (
        <div className={`attachments ${isEditMode ? 'edit-mode' : ''}`}>
          <h4>첨부 파일:</h4>
          
          {isEditMode && (
            <button 
              className="add-attachment-btn"
              onClick={() => handleAddAttachment(currentSlide)}
            >
              + 첨부 파일 추가
            </button>
          )}
          
          {currentSlideData.attachments && currentSlideData.attachments.map((attachment, attachmentIndex) => {
            const isUrl = typeof attachment === 'object' && attachment.type === 'url';
            const text = isUrl ? attachment.text : (typeof attachment === 'object' && attachment.text !== undefined ? attachment.text : attachment);
            const url = isUrl ? attachment.url : '';
            
            return (
              <div key={attachmentIndex} className="attachment-item">
                {isEditMode && editingAttachments[`${currentSlide}-${attachmentIndex}`] ? (
                  <div className="attachment-edit">
                    <textarea
                      value={editedAttachmentText}
                      rows={calculateTextareaRows(editedAttachmentText)}
                      onChange={(e) => setEditedAttachmentText(e.target.value)}
                      onBlur={() => {
                        const updatedSlides = [...promptData.slides];
                        if (isUrl) {
                          updatedSlides[currentSlide].attachments[attachmentIndex] = {
                            ...updatedSlides[currentSlide].attachments[attachmentIndex],
                            text: editedAttachmentText
                          };
                        } else {
                          updatedSlides[currentSlide].attachments[attachmentIndex] = editedAttachmentText;
                        }
                        
                        setPromptData({
                          ...promptData,
                          slides: updatedSlides
                        });
                        
                        const updatedEditing = { ...editingAttachments };
                        delete updatedEditing[`${currentSlide}-${attachmentIndex}`];
                        setEditingAttachments(updatedEditing);
                      }}
                      autoFocus
                    />
                    
                    {isUrl && (
                      <input 
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const updatedSlides = [...promptData.slides];
                          updatedSlides[currentSlide].attachments[attachmentIndex] = {
                            ...updatedSlides[currentSlide].attachments[attachmentIndex],
                            url: e.target.value
                          };
                          setPromptData({
                            ...promptData,
                            slides: updatedSlides
                          });
                        }}
                        placeholder="URL"
                        className="attachment-url-input"
                      />
                    )}
                  </div>
                ) : (
                  <div 
                    className={`attachment-content ${isEditMode ? 'editable' : ''}`}
                    onClick={() => {
                      if (isEditMode) {
                        setEditingAttachments({
                          ...editingAttachments,
                          [`${currentSlide}-${attachmentIndex}`]: true
                        });
                        setEditedAttachmentText(text);
                      }
                    }}
                  >
                    {isUrl ? (
                      <>
                        <span className="attachment-text">{text}</span>
                        <a 
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-url"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </>
                    ) : (
                      <span className="attachment-text">{text}</span>
                    )}
                  </div>
                )}
                
                {isEditMode && (
                  confirmingDelete[`attachment-${currentSlide}-${attachmentIndex}`] ? (
                    <div className="delete-confirm">
                      <span>정말 삭제하시겠습니까?</span>
                      <button onClick={() => handleDeleteAttachment(currentSlide, attachmentIndex)}>Yes</button>
                      <button onClick={() => {
                        const updatedConfirming = { ...confirmingDelete };
                        delete updatedConfirming[`attachment-${currentSlide}-${attachmentIndex}`];
                        setConfirmingDelete(updatedConfirming);
                      }}>No</button>
                    </div>
                  ) : (
                    <button 
                      className="delete-attachment-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmDelete('attachment', currentSlide, attachmentIndex);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {currentSlideData.attachments && 
       currentSlideData.attachments.length > 0 && 
       !isAttachmentVisible && (
        <button 
          className="attachment-indicator" 
          onClick={scrollToAttachments}
        >
          <ChevronDown size={16} />
          <span>첨부 파일 보기</span>
        </button>
      )}
    </div>
  );
};

export default SlideContent;