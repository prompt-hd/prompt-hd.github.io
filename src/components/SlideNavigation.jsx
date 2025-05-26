import { getShortGroupName } from '../utils/helpers';

const SlideNavigation = ({ 
  promptData, 
  currentSlide, 
  setCurrentSlide, 
  isEditMode,
  showAllSlides,
  setShowAllSlides
}) => {
  if (!promptData.slides || promptData.slides.length === 0) {
    return null;
  }
  
  // Get the list of unique groups
  const groups = [...new Set(promptData.slides.map(slide => slide.group))];
  
  // Get the current group based on the current slide
  const currentGroup = promptData.slides[currentSlide]?.group;
  
  // Get slides for the current group
  const currentGroupSlides = promptData.slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.group === currentGroup);
  
  // Find first slide index for each group
  const groupFirstSlideIndex = {};
  promptData.slides.forEach((slide, index) => {
    if (!groupFirstSlideIndex[slide.group] && groupFirstSlideIndex[slide.group] !== 0) {
      groupFirstSlideIndex[slide.group] = index;
    }
  });

  return (
    <div className="slide-nav">
      <div className="tab-list">
        {groups.map((group) => (
          <button 
            key={group}
            className={`tab-button ${currentGroup === group ? 'active' : ''}`}
            onClick={() => setCurrentSlide(groupFirstSlideIndex[group])}
          >
            {getShortGroupName(group)}
          </button>
        ))}
      </div>
      
      <div className="slide-numbers-container">
        <div className="slide-numbers">
          {currentGroup !== '표지' && currentGroupSlides.map(({ slide, index }, i) => (
            <button 
              key={index}
              className={`slide-number-btn ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        
        {isEditMode && (
          <button 
            className="view-toggle-button"
            onClick={() => setShowAllSlides(!showAllSlides)}
          >
            {showAllSlides ? '단일 슬라이드 보기' : '모든 슬라이드 보기'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SlideNavigation;