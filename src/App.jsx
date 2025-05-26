import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopNavBar from './components/TopNavBar';
import SlideNavigation from './components/SlideNavigation';
import SlideContent from './components/SlideContent';
import EditModal from './components/EditModal';
import Tutorial from './components/Tutorial';
import AttachmentIntegrityCheck from './components/AttachmentIntegrityCheck';
import { loadInitialData, saveToLocalStorage } from './utils/storage';
import { toolLinks } from './data/toolLinks';
import './App.css';

function App() {
  // Core state
  const [promptData, setPromptData] = useState({ slides: [] });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 390);
  const [isTOCOpen, setIsTOCOpen] = useState(true);
  const [showAuthCenter, setShowAuthCenter] = useState(false);
  const [showIntegrityCheck, setShowIntegrityCheck] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAllSlides, setShowAllSlides] = useState(false);
  
  // Tutorial state
  const [runTutorial, setRunTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(
    localStorage.getItem('tutorialCompleted') === 'true'
  );
  
  // UI state
  const [isAttachmentVisible, setIsAttachmentVisible] = useState(true);
  
  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Modal state
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [editingItemInfo, setEditingItemInfo] = useState(null);
  const [editedItemText, setEditedItemText] = useState('');
  const [editedItemGroup, setEditedItemGroup] = useState('');
  const [editedItemUrl, setEditedItemUrl] = useState('');
  const [editedItemPosition, setEditedItemPosition] = useState('');
  
  // Import/Export refs
  const fileInputRef = useRef(null);
  const quickNavRef = useRef(null);
  const quickNavItemsRef = useRef([]);

  // Load initial data
  useEffect(() => {
    const data = loadInitialData();
    setPromptData(data);
  }, []);

  // Save to localStorage when promptData changes
  useEffect(() => {
    if (promptData.slides && promptData.slides.length > 0) {
      saveToLocalStorage(promptData);
    }
  }, [promptData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 390) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditMode || isItemEditModalOpen) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentSlide > 0) {
          setCurrentSlide(currentSlide - 1);
        } else {
          // Wrap to the end
          setCurrentSlide(promptData.slides.length - 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentSlide < promptData.slides.length - 1) {
          setCurrentSlide(currentSlide + 1);
        } else {
          // Wrap to the beginning
          setCurrentSlide(0);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, promptData.slides, isEditMode, isItemEditModalOpen]);

  // Attachment visibility observer
  useEffect(() => {
    if (!showAuthCenter && currentSlide > 0) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsAttachmentVisible(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      
      const attachmentsElement = document.querySelector('.attachments');
      if (attachmentsElement) {
        observer.observe(attachmentsElement);
      }
      
      return () => {
        if (attachmentsElement) {
          observer.unobserve(attachmentsElement);
        }
      };
    }
  }, [currentSlide, showAuthCenter, promptData.slides]);

  // UI toggle functions
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleTOC = () => setIsTOCOpen(!isTOCOpen);
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setShowAllSlides(!isEditMode);
  };

  // Tutorial functions
  const startTutorial = () => {
    setCurrentSlide(1);
    // Small delay to ensure slide change happens before tutorial starts
    setTimeout(() => setRunTutorial(true), 100);
  };

  const restartTutorial = () => {
    localStorage.removeItem('tutorialCompleted');
    setTutorialCompleted(false);
    startTutorial();
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialCompleted(true);
    setRunTutorial(false);
  };

  // Modal handlers
  const openItemEditModal = (info) => {
    setEditingItemInfo(info);
    
    // Initialize modal fields based on edit type
    if (info.type === 'prompt' && info.actionType === 'edit') {
      setEditedItemText(promptData.slides[info.slideIndex].prompts[info.itemIndex].text);
    } else if (info.type === 'attachment' && info.actionType === 'edit') {
      const attachment = promptData.slides[info.slideIndex].attachments[info.itemIndex];
      if (typeof attachment === 'string') {
        setEditedItemText(attachment);
      } else {
        setEditedItemText(attachment.text);
        setEditedItemUrl(attachment.url || '');
      }
    } else if (info.type === 'slide' && info.actionType === 'edit') {
      setEditedItemText(promptData.slides[info.slideIndex].title);
    } else if (info.type === 'slidePosition') {
      setEditedItemPosition(String(info.slideIndex + 1));
    } else {
      // Default for add actions
      setEditedItemText('');
      setEditedItemUrl('');
      
      if (info.type === 'slide') {
        // Get existing groups and set second one as default (or first if only one exists)
        const existingGroups = new Set();
        promptData.slides.forEach(slide => {
          if (slide.group) {
            existingGroups.add(slide.group);
          }
        });
        const groupsArray = Array.from(existingGroups);
        // Use second group if available, otherwise first group, otherwise default
        const defaultGroup = groupsArray.length > 1 ? groupsArray[1] : 
                           groupsArray.length > 0 ? groupsArray[0] : '새 그룹';
        setEditedItemGroup(defaultGroup);
      } else if (info.type === 'attachment') {
        // Set default text for attachment
        setEditedItemText('실습파일 폴더 > [파일명]');
        setEditedItemGroup('');
      } else {
        setEditedItemGroup('');
      }
    }
    
    setIsItemEditModalOpen(true);
  };

  const closeItemEditModal = () => {
    setIsItemEditModalOpen(false);
    setEditingItemInfo(null);
    setEditedItemText('');
    setEditedItemGroup('');
    setEditedItemUrl('');
    setEditedItemPosition('');
  };

  // Touch gesture handlers
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < (promptData.slides?.length || 1) - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    if (promptData.slides && promptData.slides.length > 0) {
      quickNavItemsRef.current = quickNavItemsRef.current.slice(0, promptData.slides.length);
    }
  }, [promptData.slides]);

  useEffect(() => {
    if (quickNavRef.current && quickNavItemsRef.current[currentSlide]) {
      const container = quickNavRef.current;
      const activeItem = quickNavItemsRef.current[currentSlide];
      
      const containerWidth = container.offsetWidth;
      const itemWidth = activeItem.offsetWidth;
      const itemOffsetLeft = activeItem.offsetLeft;
      
      let scrollLeft = itemOffsetLeft - (containerWidth / 2) + (itemWidth / 2);
      scrollLeft = Math.max(0, scrollLeft); // Ensure scrollLeft is not negative
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [currentSlide, promptData.slides]);

  return (
    <div className="app">
      <Tutorial 
        runTutorial={runTutorial}
        tutorialCompleted={tutorialCompleted}
        handleTutorialComplete={handleTutorialComplete}
      />
      
      <TopNavBar 
        toggleEditMode={toggleEditMode}
        isEditMode={isEditMode}
        fileInputRef={fileInputRef}
        restartTutorial={restartTutorial}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        setShowAuthCenter={setShowAuthCenter}
        setShowIntegrityCheck={setShowIntegrityCheck}
      />
      
      <div className="content-wrapper">
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          isTOCOpen={isTOCOpen}
          toggleTOC={toggleTOC}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          promptData={promptData}
          isEditMode={isEditMode}
          openItemEditModal={openItemEditModal}
          setShowAuthCenter={setShowAuthCenter}
          toolLinks={toolLinks}
        />
        
        <div 
          className={`main-content ${isSidebarOpen ? 'with-sidebar' : 'no-sidebar'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showIntegrityCheck ? (
            <AttachmentIntegrityCheck 
              promptData={promptData}
              onClose={() => setShowIntegrityCheck(false)}
            />
          ) : showAuthCenter ? (
            <div className="auth-center">
              <iframe 
                src="https://aikey.app.whouse.kr/" 
                title="ChatGPT Auth Center"
                width="100%" 
                height="600px"
              ></iframe>
              <button 
                className="back-button"
                onClick={() => setShowAuthCenter(false)}
              >
                돌아가기
              </button>
            </div>
          ) : (
            <>
              <SlideNavigation 
                promptData={promptData}
                currentSlide={currentSlide}
                setCurrentSlide={setCurrentSlide}
                isEditMode={isEditMode}
                showAllSlides={showAllSlides}
                setShowAllSlides={setShowAllSlides}
              />
              
              <SlideContent 
                promptData={promptData}
                setPromptData={setPromptData}
                currentSlide={currentSlide}
                isEditMode={isEditMode}
                showAllSlides={showAllSlides}
                isAttachmentVisible={isAttachmentVisible}
                openItemEditModal={openItemEditModal}
                toolLinks={toolLinks}
                startTutorial={startTutorial}
              />
              
              {/* Mobile Bottom Navigation */}
              <div className="mobile-bottom-nav">
                {/* Quick Slide Navigation */}
                <div className="quick-slide-nav-container" ref={quickNavRef}>
                  <div className="quick-slide-nav">
                    {promptData.slides && promptData.slides.map((slide, index) => (
                      <button
                        key={index}
                        className={`quick-slide-nav-item ${currentSlide === index ? 'active' : ''}`}
                        onClick={() => setCurrentSlide(index)}
                        ref={el => { if (quickNavItemsRef.current) quickNavItemsRef.current[index] = el; }}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mobile-nav-controls">
                  <button 
                    className="nav-btn prev-btn"
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                  >
                    <ChevronLeft size={20} />
                    <span>이전</span>
                  </button>
                  
                  <div className="slide-indicator">
                    <span className="current-slide-num">{currentSlide + 1}</span>
                    <span className="slide-divider">/</span>
                    <span className="total-slides">{promptData.slides?.length || 0}</span>
                  </div>
                  
                  <button 
                    className="nav-btn next-btn"
                    onClick={() => setCurrentSlide(Math.min((promptData.slides?.length || 1) - 1, currentSlide + 1))}
                    disabled={currentSlide >= (promptData.slides?.length || 1) - 1}
                  >
                    <span>다음</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {isItemEditModalOpen && (
        <EditModal 
          editingItemInfo={editingItemInfo}
          editedItemText={editedItemText}
          setEditedItemText={setEditedItemText}
          editedItemGroup={editedItemGroup}
          setEditedItemGroup={setEditedItemGroup}
          editedItemUrl={editedItemUrl}
          setEditedItemUrl={setEditedItemUrl}
          editedItemPosition={editedItemPosition}
          setEditedItemPosition={setEditedItemPosition}
          promptData={promptData}
          setPromptData={setPromptData}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          closeModal={closeItemEditModal}
        />
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }}
        accept=".json"
        onChange={(e) => {
          // Import handler (implemented in TopNavBar)
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const parsedData = JSON.parse(event.target.result);
                if (parsedData.slides && Array.isArray(parsedData.slides)) {
                  const confirmImport = window.confirm(
                    '가져온 데이터로 현재 데이터를 덮어쓰시겠습니까?'
                  );
                  if (confirmImport) {
                    setPromptData(parsedData);
                    setCurrentSlide(0);
                    alert('데이터를 성공적으로 가져왔습니다.');
                  }
                } else {
                  alert('유효하지 않은 데이터 형식입니다.');
                }
              } catch (error) {
                alert('파일을 읽는 도중 오류가 발생했습니다: ' + error.message);
              }
              fileInputRef.current.value = '';
            };
            reader.readAsText(file);
          }
        }}
      />
    </div>
  );
}

export default App;