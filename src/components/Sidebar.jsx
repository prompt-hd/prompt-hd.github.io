import { useState } from 'react';
import { Menu, FileText, ExternalLink, Hash, ChevronDown, ChevronRight } from 'lucide-react';

const Sidebar = ({ 
  isSidebarOpen, 
  toggleSidebar, 
  isTOCOpen, 
  toggleTOC, 
  currentSlide, 
  setCurrentSlide, 
  promptData, 
  isEditMode, 
  openItemEditModal,
  setShowAuthCenter,
  toolLinks
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  // Toggle group expansion
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Render the slide list grouped by group name
  const renderSlideList = () => {
    if (!promptData.slides || promptData.slides.length === 0) return null;
    
    // Group slides by their group property
    const groupedSlides = {};
    promptData.slides.forEach((slide, index) => {
      if (!groupedSlides[slide.group]) {
        groupedSlides[slide.group] = [];
      }
      groupedSlides[slide.group].push({ slide, index });
    });
    
    return (
      <div className="slide-list">
        {Object.keys(groupedSlides).map((groupName) => {
          const isExpanded = expandedGroups[groupName] !== false; // 기본적으로 펼쳐진 상태
          
          return (
            <div key={groupName} className="slide-group">
              <button 
                className="group-header accordion-header"
                onClick={() => toggleGroup(groupName)}
              >
                <span className="group-name">{groupName}</span>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {isExpanded && (
                <ul className="group-slides">
                  {groupedSlides[groupName].map(({ slide, index }) => (
                    <li 
                      key={index}
                      className={`slide-item ${currentSlide === index ? 'current-slide' : ''}`}
                      onClick={() => {
                        setCurrentSlide(index);
                        setShowAuthCenter(false);
                      }}
                    >
                      {groupName !== '표지' && <span className="slide-number">{index}</span>}
                      <span className="slide-title">{slide.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        
        {isEditMode && (
          <button 
            className="add-slide-btn"
            onClick={() => openItemEditModal({
              type: 'slide',
              actionType: 'add'
            })}
          >
            + 슬라이드 추가
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
      <div className="sidebar-section">
        <div className="section-header">
          <h3>외부 도구</h3>
        </div>
        <div className="external-tools-grid">
          <button 
            onClick={() => window.open(toolLinks['Canva'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Canva</span>
          </button>
          
          <button 
            onClick={() => window.open(toolLinks['Napkin AI'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Napkin AI</span>
          </button>
          
          <button 
            onClick={() => window.open(toolLinks['Gamma'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Gamma</span>
          </button>
          
          <button 
            onClick={() => window.open(toolLinks['Suno AI'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Suno AI</span>
          </button>
          
          <button 
            onClick={() => window.open(toolLinks['Perplexity'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Perplexity</span>
          </button>
          
          <button 
            onClick={() => window.open(toolLinks['Claude'], '_blank')}
            className="tool-button"
          >
            <ExternalLink size={14} />
            <span>Claude</span>
          </button>
        </div>
      </div>
      
      <div className="sidebar-section toc-section">
        <div className="section-header">
          <h3>목차</h3>
        </div>
        <div className="toc-content">
          {renderSlideList()}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;